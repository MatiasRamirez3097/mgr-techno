import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";

import { buildProductsQuery } from "./buildProductsQuery";

import { PRODUCTS_PAGE_SIZE } from "@/constants/pagination";

import type {
    ProductFilters,
    GetProductsResponse,
} from "@/types/shared/product";

export async function getProducts(
    filters: ProductFilters = {},
): Promise<GetProductsResponse> {
    await connectDB();

    const page = Math.max(1, Number(filters.page) || 1);

    const skip = (page - 1) * PRODUCTS_PAGE_SIZE;

    const { query, sort } = await buildProductsQuery(filters);

    const total = await ProductModel.countDocuments(query);

    const totalPages = Math.ceil(total / PRODUCTS_PAGE_SIZE);

    const products = await ProductModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(PRODUCTS_PAGE_SIZE)
        .lean();

    return {
        products: products.map(mapProductToDTO),
        total,
        totalPages,
    };
}
