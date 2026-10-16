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
        menuOrder: category.menuOrder,
        attributeDefinitions: Array.isArray(
            (category as any).attributeDefinitions,
        )
            ? (category as any).attributeDefinitions.map((attr: any) => ({
                  key: attr.key,
                  label: attr.label,
                  type: attr.type || "select",
                  options: Array.isArray(attr.options) ? attr.options : [],
                  unit: attr.unit || "",
                  required: Boolean(attr.required),
                  filterable: attr.filterable ?? true,
              }))
            : [],
    };
}
