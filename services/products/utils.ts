import type { SortOrder } from "mongoose";

import type { ProductOrderBy } from "@/types/shared/product";

export function getMongoSort(
    orderby?: ProductOrderBy,
): Record<string, SortOrder> {
    switch (orderby) {
        case "price-asc":
            return {
                effectivePrice: 1,
            };

        case "price-desc":
            return {
                effectivePrice: -1,
            };

        case "name-asc":
            return {
                name: 1,
            };

        case "name-desc":
            return {
                name: -1,
            };

        case "oldest":
            return {
                createdAt: 1,
            };

        case "newest":
        default:
            return {
                createdAt: -1,
            };
    }
}

export function buildProductDerivedFields(data: {
    regularPrice: number;
    salePrice?: number | null;
    availableStock: number;
}) {
    return {
        effectivePrice:
            data.salePrice && data.salePrice > 0
                ? data.salePrice
                : data.regularPrice,

        isAvailable: data.availableStock > 0,
    };
}
