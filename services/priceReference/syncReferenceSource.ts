import { connectDB } from "@/lib/mongodb";
import { normalizeSearch } from "@/lib/search/normalize";
import { parseJsonLdProduct } from "@/lib/priceReference/jsonLdProduct";
import { referenceStateId, type ReferenceSource } from "@/lib/priceReference/sources";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import { acquireSyncLock, releaseSyncLock } from "@/services/distributors/syncLock";
import { fetchReferencePage, ReferenceBlockedError } from "./fetchReferencePage";
import { refreshReferenceSitemap } from "./refreshReferenceSitemap";

const HOUR = 60 * 60 * 1000;
// Frecuencias acordadas: todo el catálogo una vez por día, lo vinculado cada pocas horas
const SITEMAP_EVERY_MS = 24 * HOUR;
const FULL_REFRESH_MS = 24 * HOUR;
const LINKED_REFRESH_MS = 4 * HOUR;

// Por pasada: tope de páginas y de tiempo (la función tiene maxDuration de 300 s)
const MAX_PAGES_PER_RUN = 300;
const TIME_BUDGET_MS = 230_000;
// Dos lecturas en paralelo con pausa entre una y otra, para no cargar el sitio
const CONCURRENCY = 2;
const DELAY_MS = 700;
const LOCK_DURATION_MS = 6 * 60 * 1000;

export interface ReferenceSyncResult {
    source: string;
    status: "ok" | "partial" | "error" | "skipped";
    sitemap?: { urls: number; removed: number };
    fetched: number;
    updated: number;
    notFound: number;
    errors: number;
    priceChanges: number;
    pending: number;
    message?: string;
}

interface DueItem {
    _id: unknown;
    url: string;
    price: number | null;
}

// Páginas a leer en esta pasada, por prioridad: nunca leídas, modificadas según el sitemap,
// vinculadas vencidas (4 h) y el resto vencidas (24 h)
async function pickDueItems(sourceKey: string, limit: number): Promise<DueItem[]> {
    const now = Date.now();
    const base = { source: sourceKey, inSitemap: true };
    const queries = [
        { ...base, fetchedAt: null },
        { ...base, fetchedAt: { $ne: null }, $expr: { $gt: ["$lastmod", "$fetchedAt"] } },
        { ...base, linked: true, fetchedAt: { $lt: new Date(now - LINKED_REFRESH_MS) } },
        { ...base, fetchedAt: { $lt: new Date(now - FULL_REFRESH_MS) } },
    ];

    const picked = new Map<string, DueItem>();
    for (const query of queries) {
        if (picked.size >= limit) break;
        const items = await ReferenceCatalogItemModel.find(query, { url: 1, price: 1 })
            .sort({ fetchedAt: 1 })
            .limit(limit - picked.size + 50)
            .lean<DueItem[]>();
        for (const item of items) {
            if (picked.size >= limit) break;
            picked.set(String(item._id), item);
        }
    }
    return [...picked.values()];
}

async function countPending(sourceKey: string): Promise<number> {
    return ReferenceCatalogItemModel.countDocuments({
        source: sourceKey,
        inSitemap: true,
        $or: [
            { fetchedAt: null },
            { fetchedAt: { $lt: new Date(Date.now() - FULL_REFRESH_MS) } },
        ],
    });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Una pasada de actualización de una tienda de referencia: relee el sitemap si pasó un día
 * y lee las páginas de producto que tocan según prioridad, dentro del tiempo disponible.
 */
export async function syncReferenceSource(
    source: ReferenceSource,
): Promise<ReferenceSyncResult> {
    await connectDB();
    const stateId = referenceStateId(source.key);
    const result: ReferenceSyncResult = {
        source: source.key,
        status: "ok",
        fetched: 0,
        updated: 0,
        notFound: 0,
        errors: 0,
        priceChanges: 0,
        pending: 0,
    };

    if (!(await acquireSyncLock(stateId, LOCK_DURATION_MS))) {
        return { ...result, status: "skipped", message: "Ya hay una actualización en curso" };
    }

    const startedAt = Date.now();
    try {
        const state = await DistributorSyncStateModel.findById(stateId).lean<{
            lastSitemapAt?: Date | null;
        }>();
        const sitemapAge = state?.lastSitemapAt
            ? startedAt - new Date(state.lastSitemapAt).getTime()
            : Infinity;
        if (sitemapAge >= SITEMAP_EVERY_MS) {
            result.sitemap = await refreshReferenceSitemap(source);
            await DistributorSyncStateModel.updateOne(
                { _id: stateId },
                { $set: { lastSitemapAt: new Date(startedAt) } },
            );
        }

        const queue = await pickDueItems(source.key, MAX_PAGES_PER_RUN);
        let blocked: string | null = null;

        const worker = async () => {
            while (queue.length && !blocked && Date.now() - startedAt < TIME_BUDGET_MS) {
                const item = queue.shift()!;
                const fetchedAt = new Date();
                let page;
                try {
                    page = await fetchReferencePage(item.url);
                } catch (error) {
                    if (error instanceof ReferenceBlockedError) {
                        blocked = error.message;
                        return;
                    }
                    throw error;
                }
                result.fetched++;

                if (page.status === "not_found") {
                    result.notFound++;
                    await ReferenceCatalogItemModel.updateOne(
                        { _id: item._id, missingSince: null },
                        { $set: { missingSince: fetchedAt } },
                    );
                    await ReferenceCatalogItemModel.updateOne(
                        { _id: item._id },
                        { $set: { fetchedAt, inStock: false, fetchError: "404" } },
                    );
                } else {
                    const data = page.status === "ok" ? parseJsonLdProduct(page.body) : null;
                    if (!data) {
                        result.errors++;
                        await ReferenceCatalogItemModel.updateOne(
                            { _id: item._id },
                            {
                                $set: {
                                    fetchedAt,
                                    fetchError:
                                        page.status === "error"
                                            ? page.message
                                            : "La página no tiene datos de producto (JSON-LD)",
                                },
                            },
                        );
                    } else {
                        const priceChanged =
                            item.price !== null && item.price > 0 && item.price !== data.price;
                        if (priceChanged) result.priceChanges++;
                        result.updated++;
                        await ReferenceCatalogItemModel.updateOne(
                            { _id: item._id },
                            {
                                $set: {
                                    ...data,
                                    searchText: normalizeSearch(
                                        [data.name, data.brand, data.sku, data.gtin].join(" "),
                                    ),
                                    fetchedAt,
                                    fetchError: null,
                                    missingSince: null,
                                    ...(priceChanged
                                        ? { previousPrice: item.price, priceChangedAt: fetchedAt }
                                        : {}),
                                },
                            },
                        );
                    }
                }
                await sleep(DELAY_MS);
            }
        };

        await Promise.all(Array.from({ length: CONCURRENCY }, worker));

        result.pending = await countPending(source.key);
        if (blocked) {
            result.status = "error";
            result.message = blocked;
        } else if (result.pending > 0) {
            result.status = "partial";
        }

        await DistributorSyncStateModel.updateOne(
            { _id: stateId },
            {
                $set: {
                    lastSyncFinishedAt: new Date(),
                    lastSyncStatus: result.status,
                    lastSyncError: result.message ?? null,
                    lastSyncRequests: result.fetched,
                    ...(result.status === "ok" ? { lastSuccessfulSyncAt: new Date(startedAt) } : {}),
                    lastSyncItems: await ReferenceCatalogItemModel.countDocuments({
                        source: source.key,
                        inSitemap: true,
                        price: { $ne: null },
                    }),
                },
            },
        );
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error(`Error actualizando la referencia de precios "${source.key}":`, message);
        await DistributorSyncStateModel.updateOne(
            { _id: stateId },
            {
                $set: {
                    lastSyncFinishedAt: new Date(),
                    lastSyncStatus: "error",
                    lastSyncError: message,
                    lastSyncRequests: result.fetched,
                },
            },
        );
        return { ...result, status: "error", message };
    } finally {
        await releaseSyncLock(stateId);
    }
}
