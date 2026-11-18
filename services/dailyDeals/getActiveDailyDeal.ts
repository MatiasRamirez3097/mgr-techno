import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DailyDealModel } from "@/models/DailyDeal";
import { ProductModel } from "@/models/Product";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import type { ActiveDailyDeal } from "@/types/shared/dailyDeals";

/**
 * Oferta del día vigente: hora de fin e IDs de sus productos. Sólo cuentan los productos que
 * siguen con el precio de la oferta (si el admin lo cambió durante el día, ya no está en oferta).
 * null si no hay (o si ya pasó la medianoche y el cron todavía no la terminó).
 */
export async function getActiveDailyDeal(now = new Date()): Promise<ActiveDailyDeal | null> {
    await connectDB();
    const deal = await DailyDealModel.findOne(
        { date: todayInStoreTimeZone(now), status: "active", endsAt: { $gt: now } },
        { endsAt: 1, "items.productId": 1, "items.dealPrice": 1 },
    ).lean<{ endsAt: Date; items: { productId: Types.ObjectId; dealPrice: number }[] }>();
    if (!deal || deal.items.length === 0) return null;

    const products = await ProductModel.find(
        { _id: { $in: deal.items.map((i) => i.productId) } },
        { salePrice: 1 },
    ).lean<{ _id: Types.ObjectId; salePrice?: number | null }[]>();
    const salePrice = new Map(products.map((p) => [p._id.toString(), p.salePrice ?? null]));
    const productIds = deal.items
        .map((i) => ({ id: i.productId.toString(), dealPrice: i.dealPrice }))
        .filter((i) => salePrice.get(i.id) === i.dealPrice)
        .map((i) => i.id);

    return productIds.length > 0 ? { endsAt: deal.endsAt.toISOString(), productIds } : null;
}
