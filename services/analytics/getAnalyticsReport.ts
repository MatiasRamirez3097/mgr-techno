import { connectDB } from "@/lib/mongodb";
import { AnalyticsDailyModel } from "@/models/AnalyticsDaily";
import { AnalyticsSessionModel } from "@/models/AnalyticsSession";
import { AnalyticsSearchDailyModel } from "@/models/AnalyticsSearchDaily";
import { OrderModel, ProductModel } from "@/models";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import {
    CHANNEL_LABELS,
    regionLabel,
    type PageKind,
    type TrafficChannel,
} from "@/lib/analytics/classify";
import {
    addDays,
    addProductCount,
    buildProductRows,
    lastDays,
    startOfStoreDay,
    type ProductCounts,
    type ProductRow,
    type ProductSort,
} from "@/lib/analytics/report";

const PRODUCT_LIMIT = 30;
const DEALS_PRODUCT_LIMIT = 10;
const SEARCH_LIMIT = 25;
const OUT_OF_STOCK_LIMIT = 15;
// Pedidos que no cuentan como venta
const NOT_SOLD = ["cancelled", "failed", "refunded"];

export type SearchTermRow = { term: string; searches: number; zeroResults: number; lastResults: number };

export type AnalyticsReport = {
    days: number;
    from: string;
    to: string;
    totals: {
        visits: number;
        visitors: number;
        pageViews: number;
        withProductView: number;
        withAddToCart: number;
        reachedCheckout: number;
        orders: number;
        paidOrders: number;
    };
    daily: { date: string; visits: number; visitors: number }[];
    channels: {
        channel: TrafficChannel;
        label: string;
        visits: number;
        sources: { source: string; visits: number }[];
    }[];
    campaigns: { campaign: string; source: string; visits: number }[];
    regions: { label: string; visits: number }[];
    cities: { label: string; visits: number }[];
    devices: { device: string; visits: number }[];
    addsByPage: { page: PageKind; adds: number }[];
    products: ProductRow[];
    dailyDeals: {
        visits: number;
        pageViews: number;
        adds: number;
        products: ProductRow[];
    };
    /** Productos que hoy no tienen stock, por vistas en el período */
    outOfStockViewed: ProductRow[];
    searches: {
        total: number;
        zeroResults: number;
        top: SearchTermRow[];
        withoutResults: SearchTermRow[];
    };
};

type CountRow<T> = { _id: T; visits: number };

/**
 * Datos del panel de visitas para los últimos `days` días (días de Argentina) hasta el día de
 * `now` incluido.
 */
export async function getAnalyticsReport(
    days: number,
    sort: ProductSort,
    now: Date = new Date(),
): Promise<AnalyticsReport> {
    await connectDB();

    const to = todayInStoreTimeZone(now);
    const dates = lastDays(to, days);
    const from = dates[0];
    const dateMatch = { date: { $gte: from, $lte: to } };

    const [sessionFacets, dailyRows, orderRows, searchRows] = await Promise.all([
        AnalyticsSessionModel.aggregate([
            { $match: dateMatch },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                visits: { $sum: 1 },
                                pageViews: { $sum: "$pageViews" },
                                withProductView: { $sum: { $cond: [{ $gt: ["$productViews", 0] }, 1, 0] } },
                                withAddToCart: { $sum: { $cond: [{ $gt: ["$addToCarts", 0] }, 1, 0] } },
                                reachedCheckout: { $sum: { $cond: ["$reachedCheckout", 1, 0] } },
                                dailyDeals: { $sum: { $cond: ["$visitedDailyDeals", 1, 0] } },
                            },
                        },
                    ],
                    visitors: [{ $group: { _id: "$visitorId" } }, { $count: "n" }],
                    daily: [
                        { $group: { _id: "$date", visits: { $sum: 1 }, ids: { $addToSet: "$visitorId" } } },
                        { $project: { visits: 1, visitors: { $size: "$ids" } } },
                    ],
                    sources: [
                        { $group: { _id: { channel: "$channel", source: "$source" }, visits: { $sum: 1 } } },
                        { $sort: { visits: -1 } },
                    ],
                    campaigns: [
                        { $match: { campaign: { $ne: "" } } },
                        { $group: { _id: { campaign: "$campaign", source: "$source" }, visits: { $sum: 1 } } },
                        { $sort: { visits: -1 } },
                        { $limit: 10 },
                    ],
                    regions: [
                        { $group: { _id: { country: "$country", region: "$region" }, visits: { $sum: 1 } } },
                        { $sort: { visits: -1 } },
                    ],
                    cities: [
                        { $match: { city: { $ne: "" } } },
                        {
                            $group: {
                                _id: { country: "$country", region: "$region", city: "$city" },
                                visits: { $sum: 1 },
                            },
                        },
                        { $sort: { visits: -1 } },
                        { $limit: 10 },
                    ],
                    devices: [{ $group: { _id: "$device", visits: { $sum: 1 } } }, { $sort: { visits: -1 } }],
                },
            },
        ]),
        AnalyticsDailyModel.aggregate([
            { $match: dateMatch },
            {
                $group: {
                    _id: { event: "$event", page: "$page", productId: "$productId" },
                    count: { $sum: "$count" },
                },
            },
        ]),
        OrderModel.aggregate([
            {
                $match: {
                    source: "ecommerce",
                    status: { $nin: NOT_SOLD },
                    createdAt: { $gte: startOfStoreDay(from), $lt: startOfStoreDay(addDays(to, 1)) },
                },
            },
            {
                $facet: {
                    totals: [
                        {
                            $group: {
                                _id: null,
                                orders: { $sum: 1 },
                                paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] } },
                            },
                        },
                    ],
                    units: [
                        { $unwind: "$items" },
                        { $group: { _id: "$items.productId", units: { $sum: "$items.quantity" } } },
                    ],
                },
            },
        ]),
        AnalyticsSearchDailyModel.aggregate<{ _id: string; searches: number; zeroResults: number; lastResults: number }>([
            { $match: dateMatch },
            { $sort: { date: 1 } },
            {
                $group: {
                    _id: "$term",
                    searches: { $sum: "$searches" },
                    zeroResults: { $sum: "$zeroResults" },
                    lastResults: { $last: "$lastResults" },
                },
            },
        ]),
    ]);

    const s = sessionFacets[0] ?? {};
    const t = s.totals?.[0] ?? {};
    const o = orderRows[0] ?? {};

    // Visitas por día, con los días sin datos en 0
    const dailyByDate = new Map<string, { visits: number; visitors: number }>(
        (s.daily ?? []).map((d: { _id: string; visits: number; visitors: number }) => [d._id, d]),
    );
    const daily = dates.map((date) => ({
        date,
        visits: dailyByDate.get(date)?.visits ?? 0,
        visitors: dailyByDate.get(date)?.visitors ?? 0,
    }));

    // Canales con sus orígenes principales
    const channelMap = new Map<TrafficChannel, { visits: number; sources: { source: string; visits: number }[] }>();
    for (const row of (s.sources ?? []) as CountRow<{ channel: TrafficChannel; source: string }>[]) {
        const entry = channelMap.get(row._id.channel) ?? { visits: 0, sources: [] };
        entry.visits += row.visits;
        if (row._id.source) entry.sources.push({ source: row._id.source, visits: row.visits });
        channelMap.set(row._id.channel, entry);
    }
    const channels = [...channelMap.entries()]
        .map(([channel, v]) => ({
            channel,
            label: CHANNEL_LABELS[channel] ?? channel,
            visits: v.visits,
            sources: v.sources.slice(0, 5),
        }))
        .sort((a, b) => b.visits - a.visits);

    // Provincias: se agrupan por nombre (varios países de afuera pueden repetirse)
    const regionMap = new Map<string, number>();
    for (const row of (s.regions ?? []) as CountRow<{ country: string; region: string }>[]) {
        const label = regionLabel(row._id.country, row._id.region);
        regionMap.set(label, (regionMap.get(label) ?? 0) + row.visits);
    }
    const regions = [...regionMap.entries()]
        .map(([label, visits]) => ({ label, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 12);

    const cities = ((s.cities ?? []) as CountRow<{ country: string; region: string; city: string }>[]).map((row) => ({
        label: `${row._id.city} (${regionLabel(row._id.country, row._id.region)})`,
        visits: row.visits,
    }));

    // Contadores diarios: vistas y agregados por producto, agregados por página
    const counts = new Map<string, ProductCounts>();
    const dealCounts = new Map<string, ProductCounts>();
    const addsByPageMap = new Map<PageKind, number>();
    let dealPageViews = 0;
    for (const row of dailyRows as { _id: { event: string; page: PageKind; productId: unknown }; count: number }[]) {
        const { event, page, productId } = row._id;
        const id = productId ? String(productId) : null;
        if (event === "page_view" && page === "ofertas-del-dia") dealPageViews += row.count;
        if (event === "product_view" && id) addProductCount(counts, id, "views", row.count);
        if (event === "add_to_cart" && id) {
            addProductCount(counts, id, "adds", row.count);
            addsByPageMap.set(page, (addsByPageMap.get(page) ?? 0) + row.count);
            if (page === "ofertas-del-dia") addProductCount(dealCounts, id, "adds", row.count);
        }
    }
    for (const row of (o.units ?? []) as { _id: unknown; units: number }[]) {
        if (row._id) addProductCount(counts, String(row._id), "units", row.units);
    }
    // Las vistas y ventas de los productos de ofertas del día, para el porcentaje
    for (const [id, c] of dealCounts) {
        const all = counts.get(id);
        if (all) dealCounts.set(id, { ...c, views: all.views, units: all.units });
    }

    // Productos vistos que hoy no tienen stock (demanda para reponer)
    const viewedIds = [...counts.entries()].filter(([, c]) => c.views > 0).map(([id]) => id);
    const outOfStockDocs = viewedIds.length
        ? await ProductModel.find(
              { _id: { $in: viewedIds }, availableStock: { $lte: 0 }, type: { $ne: "bundle" } },
              { _id: 1 },
          ).lean<{ _id: unknown }[]>()
        : [];
    const outOfStockCounts = new Map<string, ProductCounts>();
    for (const doc of outOfStockDocs) {
        const id = String(doc._id);
        const c = counts.get(id);
        if (c) outOfStockCounts.set(id, c);
    }

    // Nombres sólo de los productos que van a mostrarse
    const placeholder = new Map<string, { name: string; slug: string | null }>();
    const shownIds = new Set([
        ...buildProductRows(counts, placeholder, sort, PRODUCT_LIMIT).map((r) => r.id),
        ...buildProductRows(dealCounts, placeholder, "adds", DEALS_PRODUCT_LIMIT).map((r) => r.id),
        ...buildProductRows(outOfStockCounts, placeholder, "views", OUT_OF_STOCK_LIMIT).map((r) => r.id),
    ]);
    const productDocs = shownIds.size
        ? await ProductModel.find({ _id: { $in: [...shownIds] } }, { name: 1, slug: 1 }).lean<
              { _id: unknown; name: string; slug?: string }[]
          >()
        : [];
    const products = new Map(productDocs.map((p) => [String(p._id), { name: p.name, slug: p.slug ?? null }]));

    const searchTerms: SearchTermRow[] = searchRows.map((r) => ({
        term: r._id,
        searches: r.searches,
        zeroResults: r.zeroResults,
        lastResults: r.lastResults,
    }));
    const byCount = (key: "searches" | "zeroResults") => (a: SearchTermRow, b: SearchTermRow) =>
        b[key] - a[key] || a.term.localeCompare(b.term);

    const addsByPage = [...addsByPageMap.entries()]
        .map(([page, adds]) => ({ page, adds }))
        .sort((a, b) => b.adds - a.adds);

    return {
        days,
        from,
        to,
        totals: {
            visits: t.visits ?? 0,
            visitors: s.visitors?.[0]?.n ?? 0,
            pageViews: t.pageViews ?? 0,
            withProductView: t.withProductView ?? 0,
            withAddToCart: t.withAddToCart ?? 0,
            reachedCheckout: t.reachedCheckout ?? 0,
            orders: o.totals?.[0]?.orders ?? 0,
            paidOrders: o.totals?.[0]?.paid ?? 0,
        },
        daily,
        channels,
        campaigns: ((s.campaigns ?? []) as CountRow<{ campaign: string; source: string }>[]).map((row) => ({
            campaign: row._id.campaign,
            source: row._id.source,
            visits: row.visits,
        })),
        regions,
        cities,
        devices: ((s.devices ?? []) as CountRow<string>[]).map((row) => ({ device: row._id, visits: row.visits })),
        addsByPage,
        products: buildProductRows(counts, products, sort, PRODUCT_LIMIT),
        dailyDeals: {
            visits: t.dailyDeals ?? 0,
            pageViews: dealPageViews,
            adds: addsByPageMap.get("ofertas-del-dia") ?? 0,
            products: buildProductRows(dealCounts, products, "adds", DEALS_PRODUCT_LIMIT),
        },
        outOfStockViewed: buildProductRows(outOfStockCounts, products, "views", OUT_OF_STOCK_LIMIT),
        searches: {
            total: searchTerms.reduce((acc, r) => acc + r.searches, 0),
            zeroResults: searchTerms.reduce((acc, r) => acc + r.zeroResults, 0),
            top: [...searchTerms].sort(byCount("searches")).slice(0, SEARCH_LIMIT),
            withoutResults: searchTerms
                .filter((r) => r.zeroResults > 0)
                .sort(byCount("zeroResults"))
                .slice(0, SEARCH_LIMIT),
        },
    };
}
