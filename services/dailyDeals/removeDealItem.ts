import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DailyDealModel } from "@/models/DailyDeal";
import { BusinessError } from "@/lib/errors/BusinessError";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import { restoreDealPrice, revalidateDealPages } from "./dealPrices";
import type { DailyDealDoc } from "./types";

/** Saca un producto de la oferta de hoy y le restaura el precio (si nadie lo cambió). */
export async function removeDealItem(productId: string, now = new Date()): Promise<{ restored: boolean }> {
    if (!isValidObjectId(productId)) throw new BusinessError("Producto inválido", 400);
    await connectDB();
    const deal = await DailyDealModel.findOne({
        date: todayInStoreTimeZone(now),
        status: "active",
    }).lean<DailyDealDoc>();
    const item = deal?.items.find((i) => i.productId.toString() === productId);
    if (!deal || !item) throw new BusinessError("El producto no está en la oferta de hoy", 404);

    const restored = await restoreDealPrice(item);
    await DailyDealModel.updateOne({ _id: deal._id }, { $pull: { items: { productId: item.productId } } });
    revalidateDealPages([item]);
    return { restored };
}
