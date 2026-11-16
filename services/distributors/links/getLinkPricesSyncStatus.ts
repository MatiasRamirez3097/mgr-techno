import { connectDB } from "@/lib/mongodb";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import type { LinkPricesSyncStatusDTO } from "@/types/shared/distributorLink";
import { LINK_PRICES_STATE_ID } from "./refreshRemoteLinkPrices";

const toIso = (date?: Date | null) => (date ? new Date(date).toISOString() : null);

/** Estado de la última actualización de costos de Elit y NewBytes. */
export async function getLinkPricesSyncStatus(): Promise<LinkPricesSyncStatusDTO> {
    await connectDB();
    const state = await DistributorSyncStateModel.findById(LINK_PRICES_STATE_ID).lean<{
        lastSuccessfulSyncAt?: Date | null;
        lastSyncStatus?: LinkPricesSyncStatusDTO["lastSyncStatus"];
        lastSyncError?: string | null;
        lastSyncItems?: number;
        lockedUntil?: Date | null;
    }>();
    return {
        lastSuccessfulSyncAt: toIso(state?.lastSuccessfulSyncAt),
        lastSyncStatus: state?.lastSyncStatus ?? null,
        lastSyncError: state?.lastSyncError ?? null,
        lastSyncItems: state?.lastSyncItems ?? 0,
        syncing: Boolean(state?.lockedUntil && new Date(state.lockedUntil) > new Date()),
    };
}
