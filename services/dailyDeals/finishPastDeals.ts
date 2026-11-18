import { connectDB } from "@/lib/mongodb";
import { DailyDealModel } from "@/models/DailyDeal";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import { restoreDealPrice, revalidateDealPages } from "./dealPrices";
import type { DailyDealDoc } from "./types";

/**
 * Termina las tandas de días anteriores que siguen activas: restaura el precio de sus productos
 * (salvo los que el admin cambió durante el día) y las marca como terminadas. Idempotente.
 */
export async function finishPastDeals(now = new Date()): Promise<{ deals: number; restored: number }> {
    await connectDB();
    const today = todayInStoreTimeZone(now);
    const deals = await DailyDealModel.find({ status: "active", date: { $lt: today } }).lean<DailyDealDoc[]>();

    let restored = 0;
    for (const deal of deals) {
        const items = [];
        for (const item of deal.items) {
            const ok = await restoreDealPrice(item);
            if (ok) restored++;
            items.push({ ...item, restored: ok });
        }
        await DailyDealModel.updateOne({ _id: deal._id, status: "active" }, { $set: { status: "finished", items } });
        revalidateDealPages(deal.items);
    }
    return { deals: deals.length, restored };
}
