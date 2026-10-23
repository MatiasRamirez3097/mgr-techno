import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import type { DistributorSyncStatusDTO } from "@/types/shared/distributor";
import { INVID_STATE_ID } from "./getInvidToken";

const toIso = (date?: Date | null) => (date ? new Date(date).toISOString() : null);

export async function getInvidSyncStatus(): Promise<DistributorSyncStatusDTO> {
    await connectDB();

    const [state, catalogCount, usd] = await Promise.all([
        DistributorSyncStateModel.findById(INVID_STATE_ID)
            .select("-accessToken")
            .lean<{
                lastSuccessfulSyncAt?: Date | null;
                lastSyncStatus?: DistributorSyncStatusDTO["lastSyncStatus"];
                lastSyncError?: string | null;
                lastSyncItems?: number;
                lockedUntil?: Date | null;
                rateLimitRemaining?: number | null;
                rateLimitResetAt?: Date | null;
            }>(),
        InvidCatalogItemModel.countDocuments({ available: true }),
        getUsdExchangeRate(),
    ]);

    // Fuera de la ventana informada por Invid el cupo ya se reinició
    const resetAt = state?.rateLimitResetAt ? new Date(state.rateLimitResetAt) : null;
    const quotaWindowActive = resetAt !== null && resetAt.getTime() > Date.now();

    return {
        lastSuccessfulSyncAt: toIso(state?.lastSuccessfulSyncAt),
        lastSyncStatus: state?.lastSyncStatus ?? null,
        lastSyncError: state?.lastSyncError ?? null,
        lastSyncItems: state?.lastSyncItems ?? 0,
        syncing: Boolean(
            state?.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now(),
        ),
        rateLimitRemaining: quotaWindowActive ? (state?.rateLimitRemaining ?? null) : null,
        rateLimitResetAt: quotaWindowActive ? toIso(resetAt) : null,
        catalogCount,
        usdRate: usd?.rate ?? null,
        usdRateUpdatedAt: usd ? usd.updatedAt.toISOString() : null,
    };
}
