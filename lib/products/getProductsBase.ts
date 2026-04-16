// /lib/products/getProductsBase.ts

import { ProductModel } from "@/models/Product";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { connectDB } from "@/lib/mongodb";
import type { ProductDTO } from "@/types/shared/product";

type BaseOptions = {
    limit?: number;
    query?: any;
    sort?: any;
};

export async function getProductsBase({
    limit = 8,
    query = {},
    sort = { createdAt: -1 },
}: BaseOptions): Promise<ProductDTO[]> {
    await connectDB();

    const products = await ProductModel.find({
        status: "publish",
        ...query,
    })
        .sort(sort)
        .limit(limit)
        .lean();

    return products.map(mapProductToDTO);
}
