import type { Types } from "mongoose";
import { ProductModel } from "@/models/Product";
import { revalidateProductsCache } from "@/services/products/getCatalogProducts";
import { revalidatePath } from "next/cache";

export interface DealPriceItem {
    productId: Types.ObjectId | string;
    slug?: string;
    regularPrice: number;
    dealPrice: number;
}

/**
 * Pone un producto en oferta: salePrice = effectivePrice = precio de oferta. Sólo si sigue sin
 * oferta propia y con el mismo precio normal que se usó para calcularla (si el admin lo cambió
 * entre el sorteo y ahora, no se aplica). Devuelve true si se aplicó.
 */
export async function applyDealPrice(item: DealPriceItem): Promise<boolean> {
    const result = await ProductModel.updateOne(
        { _id: item.productId, regularPrice: item.regularPrice, salePrice: { $in: [null, 0] } },
        { $set: { salePrice: item.dealPrice, effectivePrice: item.dealPrice } },
    );
    return result.modifiedCount > 0;
}

/**
 * Saca un producto de la oferta: quita el salePrice y vuelve al precio normal vigente. Sólo si
 * el salePrice sigue siendo el de la oferta; si el admin lo cambió durante el día, se respeta su
 * cambio. Devuelve true si se restauró.
 */
export async function restoreDealPrice(item: DealPriceItem): Promise<boolean> {
    const result = await ProductModel.updateOne(
        { _id: item.productId, salePrice: item.dealPrice },
        [{ $set: { salePrice: null, effectivePrice: "$regularPrice" } }],
        { updatePipeline: true },
    );
    return result.modifiedCount > 0;
}

/** Vuelve a generar el catálogo, la home, las ofertas y las páginas de los productos tocados */
export function revalidateDealPages(items: { slug?: string }[]) {
    revalidateProductsCache();
    try {
        revalidatePath("/");
        revalidatePath("/ofertas-del-dia");
        for (const item of items) if (item.slug) revalidatePath(`/productos/${item.slug}`);
    } catch {
        // Fuera de una petición de Next (scripts) no hay caché que invalidar
    }
}
