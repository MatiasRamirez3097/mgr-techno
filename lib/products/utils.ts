import { SortOrder } from "mongoose";

export const getMongoSort = (orderby?: string): Record<string, SortOrder> => {
    switch (orderby) {
        case "price":
        case "price-asc":
            return { effectivePrice: 1 };
        case "price-desc":
            return { effectivePrice: -1 };
        case "name":
        case "name-asc":
            return { name: 1 };
        case "name-desc":
            return { name: -1 };
        case "oldest":
            return { createdAt: 1 };
        case "newest":
        default:
            return { createdAt: -1 };
    }
};
