import type { NormalizedProduct } from "@/types/shared/distributor";

// Producto tal como lo devuelve la API de NewBytes (sólo los campos que usamos)
export interface NewBytesRawProduct {
    id: number;
    sku?: string | null;
    title?: string | null;
    amountStock?: number | string | null;
    mainImage?: string | null;
    cotizacion?: number | string | null;
    // finalPrice: USD con IVA
    price?: { finalPrice?: number | string | null; iva?: number | string | null } | null;
}

// Link a la ficha: el título como slug ("-" en vez de lo que no es letra o número) y el ID
export function buildNewBytesProductUrl(title: string | null | undefined, id: number): string {
    const slug = title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "";
    return `https://www.nb.com.ar/${slug}_-_${id}`;
}

export function mapNewBytesProduct(prod: NewBytesRawProduct): NormalizedProduct {
    const finalPriceUsd = Number(prod.price?.finalPrice) || 0;
    const exchangeRate = Number(prod.cotizacion) || 1;
    const iva = Number(prod.price?.iva);
    return {
        id: prod.id,
        distributor: "NewBytes",
        sku: prod.sku || prod.id.toString(),
        name: prod.title || "",
        price: finalPriceUsd * exchangeRate,
        stock: Number(prod.amountStock) || 0,
        image: prod.mainImage || null,
        link: buildNewBytesProductUrl(prod.title, prod.id),
        ...(iva > 0 ? { taxRate: iva } : {}),
    };
}
