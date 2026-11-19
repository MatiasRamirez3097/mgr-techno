/** % de descuento de un precio de oferta sobre el normal, redondeado; 0 si no hay descuento */
export function discountPercentOf(regularPrice: number, salePrice: number | null | undefined): number {
    if (!salePrice || salePrice <= 0 || regularPrice <= 0 || salePrice >= regularPrice) return 0;
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
}
