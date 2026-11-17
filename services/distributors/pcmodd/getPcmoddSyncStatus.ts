import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { PcmoddCatalogItemModel } from "@/models/PcmoddCatalogItem";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import type { DistributorSyncStatusDTO } from "@/types/shared/distributor";
import { PCMODD_STATE_ID } from "./syncPcmoddCatalog";

const toIso = (date?: Date | null) => (date ? new Date(date).toISOString() : null);

export async function getPcmoddSyncStatus(): Promise<DistributorSyncStatusDTO> {
    await connectDB();

    const [state, catalogCount, usd] = await Promise.all([
        DistributorSyncStateModel.findById(PCMODD_STATE_ID).lean<{
            lastSuccessfulSyncAt?: Date | null;
            lastSyncStatus?: DistributorSyncStatusDTO["lastSyncStatus"];
            lastSyncError?: string | null;
            lastSyncItems?: number;
            lockedUntil?: Date | null;
        }>(),
        PcmoddCatalogItemModel.countDocuments({ available: true }),
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
