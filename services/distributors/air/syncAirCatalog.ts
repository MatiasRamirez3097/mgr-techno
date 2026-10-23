import type { AnyBulkWriteOperation } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import { mapAirRow, type AirCatalogItemData } from "@/lib/distributors/airMapper";
import { hasSignificantPriceChange } from "@/lib/distributors/invidMapper";
import { acquireSyncLock, releaseSyncLock } from "../syncLock";
import { AIR_STATE_ID, fetchAirCatalog } from "./fetchAirCatalog";

const LOCK_DURATION_MS = 5 * 60 * 1000;

export interface AirSyncResult {
    status: "ok" | "error" | "skipped";
    items: number;
    priceChanges: number;
    message?: string;
}

/**
 * Descarga la lista de AIR y la guarda en `air_catalog_items`. Registra los cambios de
 * precio significativos y marca como no disponibles los artículos que dejaron de aparecer.
 */
export async function syncAirCatalog(): Promise<AirSyncResult> {
    await connectDB();

    if (!(await acquireSyncLock(AIR_STATE_ID, LOCK_DURATION_MS))) {
        return {
            status: "skipped",
            items: 0,
            priceChanges: 0,
            message: "Ya hay una sincronización en curso",
        };
    }

    const startedAt = new Date();
    let priceChanges = 0;

    try {
        const { rows, skipped, names } = await fetchAirCatalog();

        const items: AirCatalogItemData[] = [];
        for (const row of rows) {
            const item = mapAirRow(row, names);
            if (item) items.push(item);
        }
        if (items.length === 0) {
            throw new Error("La lista de AIR no tiene artículos con precio");
        }

        // Precios anteriores para detectar variaciones
        const existing = await AirCatalogItemModel.find(
            { airId: { $in: items.map((i) => i.airId) } },
            { airId: 1, finalPrice: 1 },
        ).lean<{ airId: string; finalPrice: number }[]>();
        const previousById = new Map(existing.map((e) => [e.airId, e.finalPrice]));

        const operations: AnyBulkWriteOperation[] = items.map((item) => {
            const previous = previousById.get(item.airId);
            const priceChanged = hasSignificantPriceChange(previous, item.finalPrice);
            if (priceChanged) priceChanges++;

            return {
                updateOne: {
                    filter: { airId: item.airId },
                    update: {
                        $set: {
                            ...item,
                            available: true,
                            syncedAt: startedAt,
                            ...(priceChanged
                                ? { previousFinalPrice: previous, priceChangedAt: startedAt }
                                : {}),
                        },
                    },
                    upsert: true,
                },
            };
        });
        await AirCatalogItemModel.bulkWrite(operations, { ordered: false });

        // La lista viene completa: lo que no se actualizó ya no está en AIR
        await AirCatalogItemModel.updateMany(
            { syncedAt: { $lt: startedAt }, available: true },
            { $set: { available: false } },
        );

        const message = skipped > 0 ? `${skipped} filas de la lista no se pudieron leer` : null;
        await DistributorSyncStateModel.updateOne(
            { _id: AIR_STATE_ID },
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

        return {
            status: "ok",
            items: items.length,
            priceChanges,
            ...(message ? { message } : {}),
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error("Error sincronizando el catálogo de AIR:", message);

        await DistributorSyncStateModel.updateOne(
            { _id: AIR_STATE_ID },
            {
                $set: {
                    lastSyncFinishedAt: new Date(),
                    lastSyncStatus: "error",
                    lastSyncError: message,
                },
            },
        );

        return { status: "error", items: 0, priceChanges: 0, message };
    } finally {
        await releaseSyncLock(AIR_STATE_ID);
    }
}
