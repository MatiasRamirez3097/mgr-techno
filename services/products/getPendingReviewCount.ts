import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models";

export async function getPendingReviewCount() {
    await connectDB();

    return ProductModel.countDocuments({
        status: "pending_review",
    });
}
