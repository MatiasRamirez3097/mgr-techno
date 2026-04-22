type PriceInput = {
    regularPrice: number;
    salePrice?: number | null;
};

export function getFinalPrice({ regularPrice, salePrice }: PriceInput) {
    return salePrice != null && salePrice < regularPrice
        ? salePrice
        : regularPrice;
}

export function getListPrice(price: number, markup = 0.1) {
    return Math.round(price * (1 + markup));
}

export function getProductListPrice({ regularPrice, salePrice }: PriceInput) {
    return getListPrice(p.regularPrice);
}

export function getListPriceFinal(price: number, markup = 0.1) {
    return Math.round(price * (1 + markup));
}

export function getProductListPriceFinal({
    regularPrice,
    salePrice,
}: PriceInput) {
    return getListPriceFinal(getFinalPrice(p));
}

export function getPriceNoTax(price: number, taxRate = 1.21) {
    return Math.round(price / taxRate);
}

export function getPricing({ regularPrice, salePrice }: PriceInput) {
    const finalPrice = getFinalPrice({ regularPrice, salePrice });

    return {
        finalPrice,
        listPrice: getListPrice(regularPrice),
        listPriceFinal: getListPriceFinal(salePrice ? salePrice : regularPrice),
        priceNoTax: getPriceNoTax(finalPrice),
        isOnSale: !!salePrice && salePrice < regularPrice,
    };
}
