import { connectDB } from "@/lib/mongodb";
import { DailyDealModel } from "@/models/DailyDeal";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import { restoreDealPrice, revalidateDealPages } from "./dealPrices";
import type { DailyDealDoc } from "./types";

/**
 * Cancela la tanda de hoy: restaura los precios (salvo los que el admin cambió) y la marca como
 * cancelada, así el cron no la vuelve a generar en el día (sí se puede generar otra a mano). No
 * cuenta como "ya salió" para no repetir.
 */
export async function cancelTodayDeal(now = new Date()): Promise<{ cancelled: boolean; restored: number; productIds: string[] }> {
    await connectDB();
    const deal = await DailyDealModel.findOne({
        date: todayInStoreTimeZone(now),
        status: "active",
    }).lean<DailyDealDoc>();
    if (!deal) return { cancelled: false, restored: 0, productIds: [] };

    let restored = 0;
    const items = [];
    for (const item of deal.items) {
        const ok = await restoreDealPrice(item);
        if (ok) restored++;
        items.push({ ...item, restored: ok });
    }
    await DailyDealModel.updateOne({ _id: deal._id }, { $set: { status: "cancelled", items } });
    revalidateDealPages(deal.items);
    return { cancelled: true, restored, productIds: deal.items.map((i) => i.productId.toString()) };
}
