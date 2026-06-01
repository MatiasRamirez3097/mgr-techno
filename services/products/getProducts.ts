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

    // =========================
    // PAGINATION
    // =========================

    const page = Math.max(1, Number(filters.page) || 1);

    const perPage = Math.max(1, Number(filters.perPage) || PRODUCTS_PAGE_SIZE);

    const skip = (page - 1) * perPage;

    // =========================
    // QUERY
    // =========================

    const { query, sort } = await buildProductsQuery(filters);

    // =========================
    // TOTAL
    // =========================

    const total = await ProductModel.countDocuments(query);

    const totalPages = Math.ceil(total / perPage);

    // =========================
    // PRODUCTS
    // =========================

    const products = await ProductModel.find(query)
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean();

    return {
        products: products.map(mapProductToDTO),

        total,

        totalPages,
    };
}
