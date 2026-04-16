import { SortOrder } from "mongoose";

export const getMongoSort = (orderby?: string): Record<string, SortOrder> => {
    switch (orderby) {
        case "price":
            return { price: 1 };
        case "price-desc":
            return { price: -1 };
        case "name":
            return { name: 1 };
        case "popularity":
            return { salesCount: -1 };
        default:
            return { createdAt: -1 };
    }
};
