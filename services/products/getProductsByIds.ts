// services/products/getProductsByIds.ts

import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models";
import { mapProductToDTO } from "@/lib/mappers/productMapper";

export async function getProductsByIds(ids: string[]) {
    await connectDB();

    const products = await ProductModel.find({
        _id: { $in: ids },
    }).lean();

    return products.map(mapProductToDTO);
}
