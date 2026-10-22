type PriceInput = {
    regularPrice: number;
    salePrice?: number | null;
};

// Valor por defecto del recargo de Mercado Pago (%). El vigente se edita en
// /admin/settings y se lee con getStoreSettings() / useStoreSettings().
export const DEFAULT_MP_SURCHARGE_PERCENT = 25;

export function getFinalPrice({ regularPrice, salePrice }: PriceInput) {
    return salePrice != null && salePrice < regularPrice
        ? salePrice
        : regularPrice;
}

/**
 * Precio con recargo de Mercado Pago. Única fuente de verdad: la usan tanto
 * el checkout (lo que ve el cliente) como createOrder (lo que se cobra).
 */
export function applyPaymentSurcharge(
    price: number,
    surchargePercent = DEFAULT_MP_SURCHARGE_PERCENT,
) {
    return Math.round(price * (1 + surchargePercent / 100));
}

export function getListPrice(
    price: number,
    surchargePercent = DEFAULT_MP_SURCHARGE_PERCENT,
) {
    return applyPaymentSurcharge(price, surchargePercent);
}

export function getProductListPrice(
    p: PriceInput,
    surchargePercent = DEFAULT_MP_SURCHARGE_PERCENT,
) {
    return getListPrice(p.regularPrice, surchargePercent);
}

export function getListPriceFinal(
    price: number,
    surchargePercent = DEFAULT_MP_SURCHARGE_PERCENT,
) {
    return applyPaymentSurcharge(price, surchargePercent);
}

export function getProductListPriceFinal(
    p: PriceInput,
    surchargePercent = DEFAULT_MP_SURCHARGE_PERCENT,
) {
    return getListPriceFinal(getFinalPrice(p), surchargePercent);
}

export function getPriceNoTax(price: number, taxRate = 1.21) {
    return Math.round(price / taxRate);
}

export function getPricing(
    { regularPrice, salePrice }: PriceInput,
    surchargePercent = DEFAULT_MP_SURCHARGE_PERCENT,
) {
    const finalPrice = getFinalPrice({ regularPrice, salePrice });
    return {
        finalPrice,
        listPrice: getListPrice(regularPrice, surchargePercent),
        listPriceFinal: getListPriceFinal(
            salePrice ? salePrice : regularPrice,
            surchargePercent,
        ),
        priceNoTax: getPriceNoTax(finalPrice),
        isOnSale: !!salePrice && salePrice < regularPrice,
    };
}
