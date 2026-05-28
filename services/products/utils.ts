import type { SortOrder } from "mongoose";

import type { ProductOrderBy } from "@/types/shared/product";

export function getMongoSort(
    orderby?: ProductOrderBy,
): Record<string, SortOrder> {
    switch (orderby) {
        case "price-asc":
            return {
                price: 1,
                availableStock: -1,
            };

        case "price-desc":
            return {
                price: -1,
                availableStock: -1,
            };

        case "name-asc":
            return {
                name: 1,
                availableStock: -1,
            };

        case "name-desc":
            return {
                name: -1,
                availableStock: -1,
            };

        case "oldest":
            return {
                createdAt: 1,
                availableStock: -1,
            };

        case "newest":
        default:
            return {
                createdAt: -1,
                availableStock: -1,
            };
    }
}
