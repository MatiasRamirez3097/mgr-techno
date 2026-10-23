import { connectDB } from "@/lib/mongodb";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import type { DistributorCategorySummary } from "@/types/shared/distributor";

/**
 * Rubros presentes en la copia local de AIR, para el mapeo de categorías del comparador.
 */
export async function getAirCategories(): Promise<DistributorCategorySummary[]> {
    await connectDB();

    return AirCatalogItemModel.aggregate<DistributorCategorySummary>([
        { $match: { available: true, categoryId: { $ne: "" } } },
        {
            $group: {
                _id: "$categoryId",
                name: { $first: "$category" },
                count: { $sum: 1 },
            },
        },
        { $project: { _id: 0, id: "$_id", name: 1, parentName: { $literal: null }, count: 1 } },
        { $sort: { name: 1 } },
    ]);
}
