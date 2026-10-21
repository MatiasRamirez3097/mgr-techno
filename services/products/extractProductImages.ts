export function extractProductImages(product?: any): string[] {
    if (!product?.images) return [];

    return product.images
        .map((img: any) => (typeof img === "string" ? img : img.src || ""))
        .filter(Boolean);
}
