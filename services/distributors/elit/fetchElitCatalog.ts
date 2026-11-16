import { elitPageOffsets, mapElitProduct } from "@/lib/distributors/elitMapper";
import type { NormalizedProduct } from "@/types/shared/distributor";
import { requestElitProducts } from "./requestElitProducts";

const MAX_PAGES = 60;

/** Catálogo completo de Elit (con y sin stock), página por página (~1.800 productos = ~19 páginas). */
export async function fetchElitCatalog(): Promise<{ products: NormalizedProduct[]; requests: number; error: string | null }> {
    const products: NormalizedProduct[] = [];
    let offsets = [1];
    let requests = 0;
    for (let i = 0; i < offsets.length && i < MAX_PAGES; i++) {
        try {
            requests++;
            const { items, total } = await requestElitProducts({ offset: offsets[i] });
            if (i === 0 && total !== null) offsets = elitPageOffsets(total);
            products.push(...items.map(mapElitProduct));
            if (items.length === 0) break;
        } catch (err) {
            return { products, requests, error: `Elit offset ${offsets[i]}: ${err instanceof Error ? err.message : String(err)}` };
        }
    }
    return { products, requests, error: null };
}
