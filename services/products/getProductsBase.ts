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

    const normalizedQuery: Record<string, any> = { ...query };
    if (normalizedQuery.stockStatus === "instock") {
        delete normalizedQuery.stockStatus;
        normalizedQuery.isAvailable = true;
    }
    if (normalizedQuery.onSale === true) {
        delete normalizedQuery.onSale;
        normalizedQuery.salePrice = { $exists: true, $ne: null, $gt: 0 };
    }

    const products = await ProductModel.find({
        status: "publish",
        isAvailable: true,
        ...normalizedQuery,
    })
        .populate({
            path: "bundleItems.productId",
            select: "name slug sku image regularPrice availableStock",
        })
        .sort(sort)
        .limit(limit)
        .lean();

    return products.map(mapProductToDTO);
}
