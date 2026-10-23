import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { ComparatorCategoryModel } from "@/models/ComparatorCategory";

export async function deleteComparatorCategory(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
        throw new BusinessError("Categoría no encontrada", 404);
    }

    await connectDB();

    const deleted = await ComparatorCategoryModel.findByIdAndDelete(id);
    if (!deleted) {
        throw new BusinessError("Categoría no encontrada", 404);
    }
}
