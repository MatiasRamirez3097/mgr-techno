// /lib/mappers/productMapper.ts

import { CategoryDB } from "@/types/backend/category";
import { CategoryDTO } from "@/types/shared/category";

export function mapCategoryToDTO(category: CategoryDB): CategoryDTO {
    return {
        id: category._id.toString(),
        image: category.image || "",
        name: category.name,
        parentId: category.parentId?.toString() || null,
        slug: category.slug,
    };
}
