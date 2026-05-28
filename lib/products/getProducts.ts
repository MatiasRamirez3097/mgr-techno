// /lib/products/getProducts.ts

import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { CategoryModel } from "@/models/Category";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { getCategoriesDescendants } from "@/lib/categories/getCategoriesDescendants";

// CONSTANTS
import { PRODUCTS_PAGE_SIZE } from "../constants/pagination";

// FUNCTIONS
import { getMongoSort } from "./utils";

// TYPES
import type { GetProductsResponse } from "@/types/shared/product";
import type { ProductFilters } from "@/types/shared/product";

function normalizeSearch(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "")
        .trim();
}

export async function getProducts(
    filters: ProductFilters = {},
): Promise<GetProductsResponse> {
    await connectDB();

    const page = filters.page || 1;
    const sort = getMongoSort(filters.orderby);
    const adminView = filters.adminView ? true : false;

    const start = (page - 1) * PRODUCTS_PAGE_SIZE;

    // QUERY BASE
    const query: any = {};

    // =========================
    // SEARCH
    // =========================
    if (filters.search) {
        const normalizedSearch = normalizeSearch(filters.search);

        const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean);

        query.$and = searchTerms.map((term) => ({
            $or: [
                {
                    name: {
                        $regex: term,
                        $options: "i",
                    },
                },
                {
                    sku: {
                        $regex: term,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: term,
                        $options: "i",
                    },
                },
            ],
        }));
    }

    // =========================
    // CATEGORY
    // =========================
    if (filters.category) {
        const category = await CategoryModel.findOne({
            slug: filters.category,
        }).lean();

        if (category) {
            const childIds = await getCategoriesDescendants(
                category._id.toString(),
            );

            const allCategoryIds = [category._id.toString(), ...childIds];

            query.categories = {
                $in: allCategoryIds,
            };
        } else {
            query._id = null;
        }
    }

    // =========================
    // PUBLIC VIEW
    // =========================
    if (!adminView) {
        query.status = "publish";
    }

    // =========================
    // TOTAL
    // =========================
    const total = await ProductModel.countDocuments(query);

    const totalPages = Math.ceil(total / PRODUCTS_PAGE_SIZE);

    // =========================
    // PRODUCTS
    // =========================
    const products = await ProductModel.find(query)
        .sort({
            availableStock: -1,
            ...sort,
        })
        .skip(start)
        .limit(PRODUCTS_PAGE_SIZE)
        .lean();

    return {
        products: products.map(mapProductToDTO),
        totalPages,
        total,
    };
}
