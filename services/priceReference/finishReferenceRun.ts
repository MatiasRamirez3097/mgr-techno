import { connectDB } from "@/lib/mongodb";
import { referenceStateId } from "@/lib/priceReference/sources";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";

export interface ReferenceRunSummary {
    status: "ok" | "partial" | "error";
    fetched: number;
    message?: string | null;
}

/** Registra el resultado de una pasada en DistributorSyncState, para mostrarlo en el panel */
export async function finishReferenceRun(
    sourceKey: string,
    summary: ReferenceRunSummary,
): Promise<void> {
    await connectDB();
    const now = new Date();
    const items = await ReferenceCatalogItemModel.countDocuments({
        source: sourceKey,
        inSitemap: true,
        price: { $ne: null },
    });
    await DistributorSyncStateModel.updateOne(
        { _id: referenceStateId(sourceKey) },
        {
            $set: {
                lastSyncFinishedAt: now,
                lastSyncStatus: summary.status,
                lastSyncError: summary.message ?? null,
                lastSyncRequests: summary.fetched,
                lastSyncItems: items,
                ...(summary.status !== "error" ? { lastSuccessfulSyncAt: now } : {}),
            },
        },
        { upsert: true },
    );
}
