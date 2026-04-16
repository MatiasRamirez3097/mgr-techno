import { getProductsBase } from "./getProductsBase";

export function getProductsOnSale(limit = 8) {
    return getProductsBase({
        limit,
        query: {
            onSale: true,
            stockStatus: "instock",
        },
    });
}
