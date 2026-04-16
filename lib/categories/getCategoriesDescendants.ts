// /lib/categories/getCategoryDescendants.ts

import { CategoryModel } from "@/models/Category";

export async function getCategoriesDescendants(
    parentId: string,
): Promise<string[]> {
    const children = await CategoryModel.find({ parentId }).lean();

    let ids: string[] = [];

    for (const child of children) {
        const id = child._id.toString();

        ids.push(id);

        const subChildren = await getCategoriesDescendants(id);
        ids = ids.concat(subChildren);
    }
    console.log(">>>", ids);
    return ids;
}
