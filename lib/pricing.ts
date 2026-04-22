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

export function getProductListPrice(p: PriceInput) {
    return getListPrice(p.regularPrice);
}

export function getListPriceFinal(price: number, markup = 0.1) {
    return Math.round(price * (1 + markup));
}

export function getProductListPriceFinal(p: PriceInput) {
    return getListPriceFinal(getFinalPrice(p));
}

export function getPriceNoTax(price: number, taxRate = 1.21) {
    return Math.round(price / taxRate);
}

export function getPricing(p: PriceInput) {
    const finalPrice = getFinalPrice(p);

    return {
        finalPrice,
        listPrice: getListPrice(p.regularPrice),
        listPriceFinal: getListPriceFinal(
            p.salePrice ? p.salePrice : p.regularPrice,
        ),
        priceNoTax: getPriceNoTax(finalPrice),
        isOnSale: !!p.salePrice && p.salePrice < p.regularPrice,
    };
}
