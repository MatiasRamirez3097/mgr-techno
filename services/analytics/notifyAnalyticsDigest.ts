import { connectDB } from "@/lib/mongodb";
import { AnalyticsSessionModel } from "@/models/AnalyticsSession";
import { sendDiscordNotification } from "@/lib/notifications/discord/sendDiscordNotification";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import { addDays } from "@/lib/analytics/report";
import { buildAnalyticsDigest } from "@/lib/analytics/digest";
import { getAnalyticsReport } from "./getAnalyticsReport";

/** Resumen de las visitas de ayer a Discord. No avisa si ayer no hubo visitas. */
export async function notifyAnalyticsDigest(now = new Date()) {
    await connectDB();

    const yesterday = addDays(todayInStoreTimeZone(now), -1);
    // Mediodía de ayer en Argentina: el reporte de 1 día cubre sólo ese día
    const report = await getAnalyticsReport(1, "adds", new Date(`${yesterday}T12:00:00-03:00`));

    // Promedio de los 7 días anteriores, sólo con los días que tienen datos (al empezar a medir hay menos)
    const previousDays = await AnalyticsSessionModel.aggregate<{ visits: number }>([
        { $match: { date: { $gte: addDays(yesterday, -7), $lte: addDays(yesterday, -1) } } },
        { $group: { _id: "$date", visits: { $sum: 1 } } },
    ]);
    const previousAverage = previousDays.length
        ? previousDays.reduce((acc, d) => acc + d.visits, 0) / previousDays.length
        : null;

    const digest = buildAnalyticsDigest({
        date: yesterday,
        visits: report.totals.visits,
        visitors: report.totals.visitors,
        previousAverage,
        topChannel: report.channels[0] ? { label: report.channels[0].label, visits: report.channels[0].visits } : null,
        topAdded: report.products.slice(0, 3).map((p) => ({ name: p.name, adds: p.adds })),
        dailyDealsVisits: report.dailyDeals.visits,
        orders: report.totals.orders,
        searchesWithoutResults: report.searches.withoutResults.slice(0, 5).map((s) => s.term),
    });
    if (!digest) return { notified: false, reason: "no_visits" as const };

    await sendDiscordNotification({ ...digest, color: 0xd06823 });
    return { notified: true, date: yesterday, visits: report.totals.visits };
}
