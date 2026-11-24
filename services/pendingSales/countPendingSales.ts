import { connectDB } from "@/lib/mongodb";
import { PendingSaleModel } from "@/models/PendingSale";

export async function countPendingSales(): Promise<number> {
    await connectDB();
    return PendingSaleModel.countDocuments({ status: "pending" });
}
