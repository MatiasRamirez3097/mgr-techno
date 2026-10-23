import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { ComparatorCategoryModel } from "@/models/ComparatorCategory";
import { comparatorCategorySchema } from "@/lib/validators/comparatorCategorySchema";
import {
    mapComparatorCategoryToDTO,
    type ComparatorCategoryDocument,
} from "@/lib/mappers/comparatorCategoryMapper";
import type { ComparatorCategoryDTO } from "@/types/shared/comparatorCategory";

/**
 * Crea (sin `id`) o actualiza una categoría del comparador.
 */
export async function saveComparatorCategory(
    data: unknown,
    id?: string,
): Promise<ComparatorCategoryDTO> {
    const parsed = comparatorCategorySchema.parse(data);

    await connectDB();

    if (id && !Types.ObjectId.isValid(id)) {
        throw new BusinessError("Categoría no encontrada", 404);
    }

    const duplicate = await ComparatorCategoryModel.exists({
        key: parsed.key,
        ...(id ? { _id: { $ne: id } } : {}),
    });
    if (duplicate) {
        throw new BusinessError(`Ya existe una categoría con la clave ${parsed.key}`);
    }

    const doc = id
        ? await ComparatorCategoryModel.findByIdAndUpdate(
              id,
              { $set: parsed },
              { returnDocument: "after", runValidators: true },
          ).lean<ComparatorCategoryDocument>()
        : (await ComparatorCategoryModel.create(parsed)).toObject();

    if (!doc) {
        throw new BusinessError("Categoría no encontrada", 404);
    }

    return mapComparatorCategoryToDTO(doc as ComparatorCategoryDocument);
}
