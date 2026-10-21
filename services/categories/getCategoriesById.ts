import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";

import { mapCategoryToDTO } from "@/lib/mappers/categoryMapper";
//types
import type { CategoryDTO } from "@/types/shared/category";

export async function getCategoriesById(
    id: string,
): Promise<CategoryDTO | null> {
    await connectDB();
    const category = await CategoryModel.findById(id).lean();
    if (!category) return null;
    return mapCategoryToDTO(category);
}
