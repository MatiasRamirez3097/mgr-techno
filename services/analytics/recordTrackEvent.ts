import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { AnalyticsDailyModel } from "@/models/AnalyticsDaily";
import { AnalyticsSessionModel } from "@/models/AnalyticsSession";
import { AnalyticsSearchDailyModel } from "@/models/AnalyticsSearchDaily";
import { classifyPage, classifySource, normalizeSearchTerm } from "@/lib/analytics/classify";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import type { TrackEventInput } from "@/lib/validators/trackEventSchema";

export type TrackRequestContext = {
    device: "mobile" | "tablet" | "desktop";
    country: string;
    region: string;
    city: string;
};

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

/** Dos upserts simultáneos sobre la misma clave única: el segundo falla y se reintenta como update. */
async function upsertWithRetry(run: () => Promise<unknown>) {
    try {
        await run();
    } catch (error) {
        if (!isDuplicateKey(error)) throw error;
        await run();
    }
}

/**
 * Registra un evento de la tienda: actualiza (o crea) la visita y suma el contador del día.
 */
export async function recordTrackEvent(
    event: TrackEventInput,
    context: TrackRequestContext,
    now: Date = new Date(),
) {
    await connectDB();

    const date = todayInStoreTimeZone(now);
    const page = classifyPage(event.path, event.search);
    const source = classifySource(event.entry);

    const inc: Record<string, number> = {};
    const flags: Record<string, boolean> = {};
    if (event.type === "page_view") {
        inc.pageViews = 1;
        if (page === "ofertas-del-dia") flags.visitedDailyDeals = true;
        if (page === "checkout") flags.reachedCheckout = true;
    } else if (event.type === "product_view") {
        inc.productViews = 1;
    } else if (event.type === "add_to_cart") {
        inc.addToCarts = 1;
    } else {
        inc.searches = 1;
    }

    await upsertWithRetry(() =>
        AnalyticsSessionModel.updateOne(
            { sessionId: event.sessionId },
            {
                $setOnInsert: {
                    visitorId: event.visitorId,
                    date,
                    startedAt: now,
                    ...source,
                    landingPath: event.path,
                    landingPage: page,
                    ...context,
                },
                $set: { lastSeenAt: now, ...flags },
                $inc: inc,
            },
            { upsert: true },
        ),
    );

    if (event.type === "search") {
        const term = normalizeSearchTerm(event.query ?? "");
        if (!term) return;
        const results = event.results ?? 0;
        await upsertWithRetry(() =>
            AnalyticsSearchDailyModel.updateOne(
                { date, term },
                {
                    $inc: { searches: 1, zeroResults: results === 0 ? 1 : 0 },
                    $set: { lastResults: results },
                },
                { upsert: true },
            ),
        );
        return;
    }

    const productId = event.type === "page_view" ? null : new Types.ObjectId(event.productId);
    await upsertWithRetry(() =>
        AnalyticsDailyModel.updateOne(
            { date, event: event.type, page, productId },
            { $inc: { count: 1 } },
            { upsert: true },
        ),
    );
}
