import { CategoryModel } from "@/models/Category";

export const getCategoriesDescendants = async (
    parentId: string | any,
    dontConvert: boolean = false,
): Promise<any[]> => {
    const children = await CategoryModel.find({ parentId }).lean();

    let ids: any[] = [];

    for (const child of children) {
        // Guardamos el ID en el formato solicitado (String u ObjectId)
        const idToSave = dontConvert ? child._id : child._id.toString();
        ids.push(idToSave);

        // ==========================================
        // LA SOLUCIÓN:
        // 1. Usamos .toString() para buscar al padre (para evitar problemas de tipos de Mongo)
        // 2. Le pasamos 'dontConvert' para que los nietos mantengan el formato correcto
        // ==========================================
        const subChildren = await getCategoriesDescendants(
            child._id.toString(),
            dontConvert,
        );

        ids = ids.concat(subChildren);
    }

    return ids;
};
