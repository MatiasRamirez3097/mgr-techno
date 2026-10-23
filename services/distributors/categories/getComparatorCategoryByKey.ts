import { connectDB } from "@/lib/mongodb";
import { ComparatorCategoryModel } from "@/models/ComparatorCategory";
import {
    mapComparatorCategoryToDTO,
    type ComparatorCategoryDocument,
} from "@/lib/mappers/comparatorCategoryMapper";
import type { ComparatorCategoryDTO } from "@/types/shared/comparatorCategory";

export async function getComparatorCategoryByKey(
    key: string,
): Promise<ComparatorCategoryDTO | null> {
    await connectDB();

    const doc = await ComparatorCategoryModel.findOne({
        key: key.trim().toUpperCase(),
    }).lean<ComparatorCategoryDocument>();

    return doc ? mapComparatorCategoryToDTO(doc) : null;
}
