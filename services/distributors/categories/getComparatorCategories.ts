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

// Las categorías creadas antes de sumar AIR no tienen el campo `air`: se completa una
// sola vez con el mapeo por defecto de su clave (o vacío)
async function backfillAirMapping() {
    if (!(await ComparatorCategoryModel.exists({ air: { $exists: false } }))) return;
    const defaults = new Map(DEFAULT_COMPARATOR_CATEGORIES.map((c) => [c.key, c.air]));
    const docs = await ComparatorCategoryModel.find(
        { air: { $exists: false } },
        { key: 1 },
    ).lean<{ _id: unknown; key: string }[]>();
    await ComparatorCategoryModel.bulkWrite(
        docs.map((doc) => ({
            updateOne: {
                filter: { _id: doc._id, air: { $exists: false } },
                update: { $set: { air: defaults.get(doc.key) ?? [] } },
            },
        })),
    );
}

export async function getComparatorCategories({
    activeOnly = false,
}: { activeOnly?: boolean } = {}): Promise<ComparatorCategoryDTO[]> {
    await connectDB();
    await seedIfEmpty();
    await backfillAirMapping();

    const docs = await ComparatorCategoryModel.find(activeOnly ? { active: true } : {})
        .sort({ order: 1, name: 1 })
        .lean<ComparatorCategoryDocument[]>();

    return docs.map(mapComparatorCategoryToDTO);
}
