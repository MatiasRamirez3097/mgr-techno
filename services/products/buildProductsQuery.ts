import type { SortOrder } from "mongoose";

import { CategoryModel } from "@/models";

import { normalizeSearch } from "@/lib/search/normalize";

import { getCategoriesDescendants } from "@/services/categories/getCategoriesDescendants";

import { getMongoSort } from "./utils";

import type { ProductFilters } from "@/types/shared/product";

export const buildProductsQuery = async (filters: ProductFilters = {}) => {
    const query: any = {};

    // =========================
    // SEARCH
    // =========================

    if (filters.search) {
        const normalizedSearch = normalizeSearch(filters.search);

        const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean);

        query.searchTerms = {
            $all: searchTerms,
        };
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

            query.categories = {
                $in: [category._id.toString(), ...childIds],
            };
        } else {
            query._id = null;
        }
    }

    // =========================
    // ON SALE
    // =========================

    if (filters.onSale) {
        query.salePrice = {
            $exists: true,
            $ne: null,
            $gt: 0,
        };
    }

    // =========================
    // PUBLIC VIEW
    // =========================

    if (filters.status) {
        query.status = filters.status;
    }

    if (!filters.adminView) {
        query.status = "publish";
    }

    // =========================
    // SORT
    // =========================
    console.log(filters.orderby);
    const sort: Record<string, SortOrder> = {
        isAvailable: -1,
        ...getMongoSort(filters.orderby),
    };
    console.log(sort);
    return {
        query,
        sort,
    };
};
