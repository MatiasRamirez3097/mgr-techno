import { connectDB } from "@/lib/mongodb";
import { StockCountModel } from "@/models/StockCount";
import { sendDiscordNotification } from "@/lib/notifications/discord/sendDiscordNotification";
import { getStockCountSettings } from "@/services/settings/getStockCountSettings";
import { buildStockCountDigest } from "@/lib/inventory/stockCount";
import { getStockCountQueue } from "./getStockCountQueue";

/**
 * Aviso a Discord del conteo del día: si faltó contar productos de la lista o hay diferencias
 * sin resolver. No avisa si está desactivado o si no hay nada que decir.
 */
export async function notifyStockCounts(now = new Date()) {
    await connectDB();
    const settings = await getStockCountSettings();
    if (!settings.stockCountNotifyEnabled) return { notified: false, reason: "disabled" as const };

    const [{ queue, countedToday }, differences] = await Promise.all([
        getStockCountQueue(settings, { now }),
        StockCountModel.find({ status: "difference" }, { productName: 1, difference: 1 })
            .sort({ createdAt: -1 })
            .lean<{ productName: string; difference: number }[]>(),
    ]);
    const digest = buildStockCountDigest({
        countedToday,
        dailyProducts: settings.stockCountDailyProducts,
        remainingToCount: queue.length,
        differences,
    });
    if (!digest) return { notified: false, reason: "nothing" as const };

    await sendDiscordNotification({ ...digest, color: 0x5865f2 });
    return { notified: true, countedToday, differences: differences.length };
}
