import type { AnyBulkWriteOperation } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import {
    hasSignificantPriceChange,
    mapInvidArticle,
    type InvidCatalogItemData,
} from "@/lib/distributors/invidMapper";
import { acquireSyncLock, releaseSyncLock } from "../syncLock";
import { INVID_STATE_ID } from "./getInvidToken";
import {
    fetchInvidArticlesPage,
    INVID_PAGE_SIZE,
    InvidRateLimitError,
} from "./fetchInvidArticlesPage";

// Tope de páginas por sincronización: nunca acercarse al límite de 50 requests/hora
const MAX_PAGES = 40;
const LOCK_DURATION_MS = 10 * 60 * 1000;

export interface InvidSyncResult {
    status: "ok" | "partial" | "error" | "skipped";
    items: number;
    requests: number;
    priceChanges: number;
    message?: string;
}

// Verifica que el cupo informado por Invid alcance para recorrer todo el catálogo
async function hasEnoughQuota(): Promise<boolean> {
    const state = await DistributorSyncStateModel.findById(INVID_STATE_ID).lean<{
        rateLimitRemaining?: number | null;
        rateLimitResetAt?: Date | null;
        lastSyncItems?: number;
    }>();
    if (
        state?.rateLimitRemaining === null ||
        state?.rateLimitRemaining === undefined ||
        !state.rateLimitResetAt ||
        new Date(state.rateLimitResetAt).getTime() < Date.now()
    ) {
        return true;
    }
    const pagesNeeded = Math.ceil((state.lastSyncItems || 0) / INVID_PAGE_SIZE) + 1;
    return state.rateLimitRemaining >= pagesNeeded;
}

/**
 * Descarga el catálogo completo de Invid y lo guarda en `invid_catalog_items`.
 * Registra los cambios de precio significativos y marca como no disponibles
 * los artículos que dejaron de aparecer.
 */
export async function syncInvidCatalog(): Promise<InvidSyncResult> {
    await connectDB();

    if (!(await acquireSyncLock(INVID_STATE_ID, LOCK_DURATION_MS))) {
        return {
            status: "skipped",
            items: 0,
            requests: 0,
            priceChanges: 0,
            message: "Ya hay una sincronización en curso",
        };
    }

    const startedAt = new Date();
    const items: InvidCatalogItemData[] = [];
    let requests = 0;
    let complete = false;
    let errorMessage: string | null = null;
    let priceChanges = 0;

    try {
        if (!(await hasEnoughQuota())) {
            const result: InvidSyncResult = {
                status: "skipped",
                items: 0,
                requests: 0,
                priceChanges: 0,
                message: "No queda cupo de requests en Invid para esta hora",
            };
            await DistributorSyncStateModel.updateOne(
                { _id: INVID_STATE_ID },
                {
                    $set: {
                        lastSyncFinishedAt: new Date(),
                        lastSyncStatus: result.status,
                        lastSyncError: result.message,
                    },
                },
            );
            return result;
        }

        let offset = 0;
        try {
            while (requests < MAX_PAGES) {
                const page = await fetchInvidArticlesPage(offset);
                requests++;

                for (const raw of page.articles) {
                    const item = mapInvidArticle(raw);
                    if (item) items.push(item);
                }

                if (!page.hasNextPage) {
                    complete = true;
                    break;
                }
                offset += INVID_PAGE_SIZE;
            }
            if (!complete) {
                errorMessage = `Se cortó al llegar al tope de ${MAX_PAGES} páginas`;
            }
        } catch (error) {
            if (error instanceof InvidRateLimitError) {
                errorMessage = error.message;
            } else {
                throw error;
            }
        }

        if (items.length > 0) {
            // Precios anteriores para detectar variaciones
            const existing = await InvidCatalogItemModel.find(
                { invidId: { $in: items.map((i) => i.invidId) } },
                { invidId: 1, finalPrice: 1, currency: 1 },
            ).lean<{ invidId: string; finalPrice: number; currency: string }[]>();
            const previousById = new Map(existing.map((e) => [e.invidId, e]));

            const operations: AnyBulkWriteOperation[] = items.map((item) => {
                const previous = previousById.get(item.invidId);
                const priceChanged =
                    previous &&
                    previous.currency === item.currency &&
                    hasSignificantPriceChange(previous.finalPrice, item.finalPrice);
                if (priceChanged) priceChanges++;

                return {
                    updateOne: {
                        filter: { invidId: item.invidId },
                        update: {
                            $set: {
                                ...item,
                                syncedAt: startedAt,
                                ...(priceChanged
                                    ? {
                                          previousFinalPrice: previous.finalPrice,
                                          priceChangedAt: startedAt,
                                      }
                                    : {}),
                            },
                        },
                        upsert: true,
                    },
                };
            });

            await InvidCatalogItemModel.bulkWrite(operations, { ordered: false });
        }

        // Sólo con el catálogo completo podemos saber qué artículos ya no están
        if (complete) {
            await InvidCatalogItemModel.updateMany(
                { syncedAt: { $lt: startedAt }, available: true },
                { $set: { available: false } },
            );
        }

        const status: InvidSyncResult["status"] = complete ? "ok" : "partial";
        await DistributorSyncStateModel.updateOne(
            { _id: INVID_STATE_ID },
            {
                $set: {
                    lastSyncFinishedAt: new Date(),
                    lastSyncStatus: status,
                    lastSyncError: errorMessage,
                    lastSyncRequests: requests,
                    ...(complete
                        ? { lastSuccessfulSyncAt: startedAt, lastSyncItems: items.length }
                        : {}),
                },
            },
        );

        return {
            status,
            items: items.length,
            requests,
            priceChanges,
            ...(errorMessage ? { message: errorMessage } : {}),
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Error desconocido";
        console.error("Error sincronizando el catálogo de Invid:", message);

        await DistributorSyncStateModel.updateOne(
            { _id: INVID_STATE_ID },
            {
                $set: {
                    lastSyncFinishedAt: new Date(),
                    lastSyncStatus: "error",
                    lastSyncError: message,
                    lastSyncRequests: requests,
                },
            },
        );

        return { status: "error", items: 0, requests, priceChanges: 0, message };
    } finally {
        await releaseSyncLock(INVID_STATE_ID);
    }
}
