import { connectDB } from "@/lib/mongodb";
import { PcmoddCatalogItemModel } from "@/models/PcmoddCatalogItem";
import type { DistributorCategorySummary } from "@/types/shared/distributor";

/**
 * Marcas de la hoja de PCMODD (no tiene categorías): se usan como "categorías" en el mapeo del
 * comparador, ej: la categoría Coolers del comparador → marcas ID-COOLING y THERMALRIGHT.
 */
export async function getPcmoddCategories(): Promise<DistributorCategorySummary[]> {
    await connectDB();

    return PcmoddCatalogItemModel.aggregate<DistributorCategorySummary>([
        { $match: { available: true, brand: { $ne: "" } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
        { $project: { _id: 0, id: "$_id", name: "$_id", parentName: { $literal: null }, count: 1 } },
        { $sort: { name: 1 } },
    ]);
}
