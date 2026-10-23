import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import type { DistributorSyncStatusDTO } from "@/types/shared/distributor";
import { AIR_STATE_ID } from "./fetchAirCatalog";

const toIso = (date?: Date | null) => (date ? new Date(date).toISOString() : null);

export async function getAirSyncStatus(): Promise<DistributorSyncStatusDTO> {
    await connectDB();

    const [state, catalogCount, usd] = await Promise.all([
        DistributorSyncStateModel.findById(AIR_STATE_ID).lean<{
            lastSuccessfulSyncAt?: Date | null;
            lastSyncStatus?: DistributorSyncStatusDTO["lastSyncStatus"];
            lastSyncError?: string | null;
            lastSyncItems?: number;
            lockedUntil?: Date | null;
        }>(),
        AirCatalogItemModel.countDocuments({ available: true }),
        getUsdExchangeRate(),
    ]);

    return {
        lastSuccessfulSyncAt: toIso(state?.lastSuccessfulSyncAt),
        lastSyncStatus: state?.lastSyncStatus ?? null,
        lastSyncError: state?.lastSyncError ?? null,
        lastSyncItems: state?.lastSyncItems ?? 0,
        syncing: Boolean(
            state?.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now(),
        ),
        rateLimitRemaining: null,
        rateLimitResetAt: null,
        catalogCount,
        usdRate: usd?.rate ?? null,
        usdRateUpdatedAt: usd ? usd.updatedAt.toISOString() : null,
    };
}
