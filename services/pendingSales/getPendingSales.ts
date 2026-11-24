import { connectDB } from "@/lib/mongodb";
import { mapPendingSaleToDTO } from "@/lib/mappers/pendingSaleMapper";
import { PendingSaleModel } from "@/models/PendingSale";
import type { PendingSaleDoc } from "@/types/backend/pendingSale";
import type { PendingSaleStatus } from "@/types/shared/pendingSale";

const STATUSES: PendingSaleStatus[] = ["pending", "converted", "discarded"];

export async function getPendingSales(status: string | null = "pending", limit = 100) {
    await connectDB();
    const filter = STATUSES.includes(status as PendingSaleStatus) ? { status } : {};
    const docs = await PendingSaleModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(Math.min(Math.max(limit, 1), 500))
        .lean<PendingSaleDoc[]>();
    return docs.map(mapPendingSaleToDTO);
}
