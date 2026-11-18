import { connectDB } from "@/lib/mongodb";
import { DailyDealModel } from "@/models/DailyDeal";
import { ProductModel } from "@/models/Product";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import type { DailyDealDTO, DailyDealsOverview } from "@/types/shared/dailyDeals";
import type { DailyDealDoc } from "./types";

const HISTORY_LIMIT = 14;

function mapDeal(doc: DailyDealDoc, currentSalePrice?: Map<string, number | null>): DailyDealDTO {
    return {
        date: doc.date,
        startsAt: doc.startsAt.toISOString(),
        endsAt: doc.endsAt.toISOString(),
        status: doc.status,
        items: doc.items.map((i) => {
            const productId = i.productId.toString();
            return {
                productId,
                name: i.name,
                slug: i.slug || "",
                regularPrice: i.regularPrice,
                dealPrice: i.dealPrice,
                cost: i.cost,
                costDistributor: i.costDistributor,
                groupId: i.groupId,
                repeated: Boolean(i.repeated),
                restored: Boolean(i.restored),
                // En la tanda activa: si el admin le cambió el precio durante el día
                priceChanged: currentSalePrice ? currentSalePrice.get(productId) !== i.dealPrice : false,
            };
        }),
    };
}

/** Tanda de hoy (si hay) e historial reciente, para la página del admin */
export async function getDailyDealsOverview(now = new Date()): Promise<DailyDealsOverview> {
    await connectDB();
    const today = todayInStoreTimeZone(now);
    const deals = await DailyDealModel.find({}).sort({ date: -1 }).limit(HISTORY_LIMIT + 1).lean<DailyDealDoc[]>();
    const current = deals.find((d) => d.date === today && d.status === "active") ?? null;

    let currentSalePrice: Map<string, number | null> | undefined;
    if (current) {
        const products = await ProductModel.find(
            { _id: { $in: current.items.map((i) => i.productId) } },
            { salePrice: 1 },
        ).lean<{ _id: { toString(): string }; salePrice?: number | null }[]>();
        currentSalePrice = new Map(products.map((p) => [p._id.toString(), p.salePrice ?? null]));
    }

    return {
        today,
        current: current ? mapDeal(current, currentSalePrice) : null,
        history: deals.filter((d) => d !== current).slice(0, HISTORY_LIMIT).map((d) => mapDeal(d)),
    };
}
