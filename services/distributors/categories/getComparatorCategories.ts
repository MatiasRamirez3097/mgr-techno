import { connectDB } from "@/lib/mongodb";
import { ComparatorCategoryModel } from "@/models/ComparatorCategory";
import { DEFAULT_COMPARATOR_CATEGORIES } from "@/lib/distributors/comparatorCategoryDefaults";
import {
    mapComparatorCategoryToDTO,
    type ComparatorCategoryDocument,
} from "@/lib/mappers/comparatorCategoryMapper";
import type { ComparatorCategoryDTO } from "@/types/shared/comparatorCategory";

// La primera vez que la colección está vacía se carga con el mapeo histórico
async function seedIfEmpty() {
    if ((await ComparatorCategoryModel.estimatedDocumentCount()) > 0) return;
    try {
        await ComparatorCategoryModel.insertMany(DEFAULT_COMPARATOR_CATEGORIES, {
            ordered: false,
        });
    } catch (error) {
        // Otra instancia pudo haberla cargado al mismo tiempo (clave duplicada)
        if ((error as { code?: number }).code !== 11000) throw error;
    }
}

export async function getComparatorCategories({
    activeOnly = false,
}: { activeOnly?: boolean } = {}): Promise<ComparatorCategoryDTO[]> {
    await connectDB();
    await seedIfEmpty();

    const docs = await ComparatorCategoryModel.find(activeOnly ? { active: true } : {})
        .sort({ order: 1, name: 1 })
        .lean<ComparatorCategoryDocument[]>();

    return docs.map(mapComparatorCategoryToDTO);
}
