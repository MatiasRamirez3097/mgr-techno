import { connectDB } from "@/lib/mongodb";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import type { InvidCategorySummary } from "@/types/shared/distributor";

/**
 * Categorías presentes en el catálogo local de Invid, para completar `CATEGORY_MAP`.
 */
export async function getInvidCategories(): Promise<InvidCategorySummary[]> {
    await connectDB();

    return InvidCatalogItemModel.aggregate<InvidCategorySummary>([
        { $match: { available: true } },
        { $unwind: "$categories" },
        {
            $group: {
                _id: "$categories.id",
                name: { $first: "$categories.name" },
                parentName: { $first: "$categories.parentName" },
                count: { $sum: 1 },
            },
        },
        { $project: { _id: 0, id: "$_id", name: 1, parentName: 1, count: 1 } },
        { $sort: { parentName: 1, name: 1 } },
    ]);
}
