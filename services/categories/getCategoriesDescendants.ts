// /lib/categories/getCategoryDescendants.ts

import { CategoryModel } from "@/models/Category";

export const getCategoriesDescendants = async (
    parentId: string,
    dontConvert: boolean = false,
): Promise<string[]> => {
    const children = await CategoryModel.find({ parentId }).lean();

    let ids: any[] = [];

    for (const child of children) {
        const id = dontConvert ? child._id : child._id.toString();

        ids.push(id);

        const subChildren = await getCategoriesDescendants(id);
        ids = ids.concat(subChildren);
    }
    return ids;
};
