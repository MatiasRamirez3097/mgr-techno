import { after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { AIR_STATE_ID } from "./fetchAirCatalog";
import { syncAirCatalog } from "./syncAirCatalog";

// Respaldo del cron: si el catálogo quedó viejo, se sincroniza después de responder
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
// Tras un intento (fallido o no) esperamos antes de reintentar
const RETRY_AFTER_MS = 15 * 60 * 1000;

export async function scheduleAirSyncIfStale(): Promise<void> {
    await connectDB();

    const state = await DistributorSyncStateModel.findById(AIR_STATE_ID).lean<{
        lastSuccessfulSyncAt?: Date | null;
        lastSyncStartedAt?: Date | null;
    }>();

    const now = Date.now();
    const lastSuccess = state?.lastSuccessfulSyncAt
        ? new Date(state.lastSuccessfulSyncAt).getTime()
        : 0;
    const lastAttempt = state?.lastSyncStartedAt
        ? new Date(state.lastSyncStartedAt).getTime()
        : 0;

    if (now - lastSuccess < STALE_AFTER_MS || now - lastAttempt < RETRY_AFTER_MS) {
        return;
    }

    try {
        after(() => syncAirCatalog());
    } catch {
        // Fuera de un request (ej: scripts) no hay `after`; no sincronizamos
    }
}
