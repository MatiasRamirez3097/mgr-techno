import { DistributorSyncStateModel } from "@/models/DistributorSyncState";

/**
 * Toma el lock de sincronización de un distribuidor (documento de DistributorSyncState),
 * para evitar dos sincronizaciones en paralelo entre instancias serverless.
 */
export async function acquireSyncLock(stateId: string, durationMs: number): Promise<boolean> {
    const now = new Date();
    await DistributorSyncStateModel.updateOne(
        { _id: stateId },
        { $setOnInsert: { lockedUntil: null } },
        { upsert: true },
    );
    const locked = await DistributorSyncStateModel.findOneAndUpdate(
        {
            _id: stateId,
            $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }],
        },
        {
            $set: {
                lockedUntil: new Date(now.getTime() + durationMs),
                lastSyncStartedAt: now,
            },
        },
    );
    return Boolean(locked);
}

export async function releaseSyncLock(stateId: string): Promise<void> {
    await DistributorSyncStateModel.updateOne({ _id: stateId }, { $set: { lockedUntil: null } });
}
