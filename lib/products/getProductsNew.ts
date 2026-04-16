import { getProductsBase } from "./getProductsBase";

export function getProductsNew(limit = 8) {
    return getProductsBase({
        limit,
        query: {
            stockStatus: "instock",
        },
        sort: { createdAt: -1 },
    });
}
