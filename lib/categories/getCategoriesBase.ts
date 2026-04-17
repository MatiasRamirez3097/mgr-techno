// /lib/products/getProductsBase.ts

import { CategoryModel } from "@/models/Category";
import { mapCategoryToDTO } from "@/lib/mappers/categoryMapper";
import { connectDB } from "@/lib/mongodb";
import type { CategoryDTO } from "@/types/shared/category";

type BaseOptions = {
    limit?: number;
    query?: any;
    sort?: any;
};

export async function getCategoriesBase({
    limit = 8,
    query = {},
    sort = { createdAt: -1 },
}: BaseOptions): Promise<CategoryDTO[]> {
    await connectDB();

    const categories = await CategoryModel.find({
        ...query,
    })
        .sort(sort)
        .limit(limit)
        .lean();
    return categories.map(mapCategoryToDTO);
}
