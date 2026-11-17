import type { AnyBulkWriteOperation } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { PcmoddCatalogItemModel } from "@/models/PcmoddCatalogItem";
import { buildSheetCsvUrl, parsePcmoddSheet } from "@/lib/distributors/pcmoddMapper";
import { isIncompleteAirList } from "@/lib/distributors/airMapper";
import { hasSignificantPriceChange } from "@/lib/distributors/invidMapper";
import { acquireSyncLock, releaseSyncLock } from "../syncLock";

export const PCMODD_STATE_ID = "pcmodd";
const LOCK_DURATION_MS = 3 * 60 * 1000;

export interface PcmoddSyncResult {
    status: "ok" | "error" | "skipped";
    items: number;
    priceChanges: number;
    message?: string;
}

/** true si está configurado el link de la hoja (sin él, PCMODD no aparece en el comparador) */
export const isPcmoddConfigured = () => Boolean(process.env.PCMODD_SHEET_URL);

/**
 * Lee la hoja de PCMODD (pública; el link va en PCMODD_SHEET_URL y nunca se muestra) y la guarda en
 * `pcmodd_catalog_items`. Registra los cambios de precio significativos y marca como no disponibles
 * los productos que dejaron de aparecer.
 */
export async function syncPcmoddCatalog(): Promise<PcmoddSyncResult> {
    const sheetUrl = process.env.PCMODD_SHEET_URL;
    if (!sheetUrl) {
        return { status: "skipped", items: 0, priceChanges: 0, message: "Falta PCMODD_SHEET_URL" };
    }
    const csvUrl = buildSheetCsvUrl(sheetUrl);
    if (!csvUrl) {
        return { status: "error", items: 0, priceChanges: 0, message: "PCMODD_SHEET_URL no es un link de Google Sheets" };
    }

    await connectDB();
    if (!(await acquireSyncLock(PCMODD_STATE_ID, LOCK_DURATION_MS))) {
        return { status: "skipped", items: 0, priceChanges: 0, message: "Ya hay una sincronización en curso" };
    }

    const startedAt = new Date();
    let priceChanges = 0;
    try {
        // Errores sin la URL: el link de la hoja no se loguea
        const response = await fetch(csvUrl, {
            cache: "no-store",
            redirect: "follow",
            signal: AbortSignal.timeout(30_000),
        }).catch(() => {
            throw new Error("No se pudo descargar la hoja de PCMODD");
        });
        if (!response.ok) {
            throw new Error(
                `La hoja de PCMODD respondió HTTP ${response.status} (¿dejó de ser pública o cambió el link?)`,
            );
        }
        const csv = await response.text();
        if (/^\s*<!doctype html|^\s*<html/i.test(csv)) {
            throw new Error("La hoja de PCMODD no se pudo leer como CSV (¿dejó de ser pública?)");
        }

        const { items, skipped } = parsePcmoddSheet(csv);
        if (items.length === 0) throw new Error("La hoja de PCMODD no tiene productos con precio");

        const state = await DistributorSyncStateModel.findById(PCMODD_STATE_ID, { lastSyncItems: 1 }).lean<{
            lastSyncItems?: number;
        }>();
        if (isIncompleteAirList(items.length, state?.lastSyncItems)) {
            throw new Error(
                `La hoja llegó con ${items.length} productos y la anterior tenía ${state?.lastSyncItems}: no se importó`,
            );
        }

        const existing = await PcmoddCatalogItemModel.find(
            { pcmoddId: { $in: items.map((i) => i.pcmoddId) } },
            { pcmoddId: 1, finalPrice: 1 },
        ).lean<{ pcmoddId: string; finalPrice: number }[]>();
        const previousById = new Map(existing.map((e) => [e.pcmoddId, e.finalPrice]));

        const operations: AnyBulkWriteOperation[] = items.map((item) => {
            const previous = previousById.get(item.pcmoddId);
            const priceChanged = hasSignificantPriceChange(previous, item.finalPrice);
            if (priceChanged) priceChanges++;
            return {
                updateOne: {
                    filter: { pcmoddId: item.pcmoddId },
                    update: {
                        $set: {
                            ...item,
                            available: true,
                            syncedAt: startedAt,
                            ...(priceChanged ? { previousFinalPrice: previous, priceChangedAt: startedAt } : {}),
                        },
                    },
                    upsert: true,
                },
            };
        });
        await PcmoddCatalogItemModel.bulkWrite(operations, { ordered: false });

        // La hoja viene completa: lo que no se actualizó ya no está en la lista
        await PcmoddCatalogItemModel.updateMany(
            { syncedAt: { $lt: startedAt }, available: true },
            { $set: { available: false } },
        );

        const message = skipped > 0 ? `${skipped} filas de la hoja no se pudieron leer` : null;
        await DistributorSyncStateModel.updateOne(
            { _id: PCMODD_STATE_ID },
            {
                $set: {
                    lastSyncFinishedAt: new Date(),
                    lastSyncStatus: "ok",
                    lastSyncError: message,
                    lastSyncRequests: 1,
                    lastSuccessfulSyncAt: startedAt,
                    lastSyncItems: items.length,
                },
            },
        );
        return { status: "ok", items: items.length, priceChanges, ...(message ? { message } : {}) };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error("Error sincronizando la lista de PCMODD:", message);
        await DistributorSyncStateModel.updateOne(
            { _id: PCMODD_STATE_ID },
            { $set: { lastSyncFinishedAt: new Date(), lastSyncStatus: "error", lastSyncError: message } },
        );
        return { status: "error", items: 0, priceChanges: 0, message };
    } finally {
        await releaseSyncLock(PCMODD_STATE_ID);
    }
}
