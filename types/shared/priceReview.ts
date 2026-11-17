import type { MarginStatus } from "@/lib/priceReview";
import type { DistributorKey } from "@/types/shared/distributorLink";

export type PriceReviewView =
    | "linked"
    | "below_min"
    | "below_target"
    | "no_stock"
    | "unlinked"
    | "suggested"
    | "ref_expensive"
    | "ref_cheaper"
    | "all";

export interface PriceReviewFilters {
    search?: string;
    categoryId?: string;
    status?: "publish" | "all";
    // Stock propio disponible: "in" = con stock, "out" = sin stock
    stock?: "in" | "out";
    view?: PriceReviewView;
    page?: number;
    limit?: number;
}

export interface PriceReviewDistributorCost {
    distributor: DistributorKey;
    name: string;
    link: string | null;
    price: number | null;
    stock: number | null;
    stockLabel: string | null;
    inStock: boolean;
    available: boolean;
    lastCheckedAt: string | null;
    // Variación del último cambio de costo, si fue en los últimos días (Elit, NewBytes)
    recentChange: number | null;
}

// Precio de venta de un producto vinculado en una tienda de referencia
export interface PriceReviewReference {
    source: string;
    sourceLabel: string;
    sourceShortLabel: string;
    name: string;
    url: string;
    // Precio vigente (oferta si la hay) y de lista, en ARS
    price: number | null;
    listPrice: number | null;
    inStock: boolean;
    available: boolean;
    fetchedAt: string | null;
    // Variación del último cambio de precio, si fue en los últimos días
    recentChange: number | null;
}

// Posible equivalente en un distribuidor no vinculado, encontrado por la búsqueda automática
export interface PriceReviewLinkSuggestion {
    id: string;
    distributor: DistributorKey;
    distributorProductId: string;
    distributorSku: string;
    name: string;
    link: string | null;
    image: string | null;
    // Costo al momento de la búsqueda (ARS c/IVA)
    price: number;
    stock: number;
    stockLabel: string | null;
    matchMethod: "part_number" | "ean" | "name";
    matchedValue: string;
    // Similitud del nombre (0 a 1); 1 en las coincidencias por código
    score: number;
}

export interface PriceReviewRow {
    productId: string;
    name: string;
    sku: string;
    image: string | null;
    status: string;
    regularPrice: number;
    salePrice: number | null;
    // Precio de venta vigente (c/IVA, sin recargo de Mercado Pago)
    effectivePrice: number;
    costs: PriceReviewDistributorCost[];
    // Mejor costo con stock entre los distribuidores vinculados (ARS c/IVA)
    bestCost: number | null;
    bestDistributor: DistributorKey | null;
    // Último costo de compra propio, pasado a c/IVA con la alícuota del producto
    lastPurchaseCost: number | null;
    lastPurchaseAt: string | null;
    targetMarginPercent: number;
    minMarginPercent: number;
    // Categoría de la que sale el margen objetivo (null = general)
    marginSource: string | null;
    // Margen sobre el mejor costo (0.2 = 20%)
    margin: number | null;
    marginStatus: MarginStatus;
    suggestedPrice: number | null;
    // Sugerencias de vínculo en distribuidores todavía no vinculados
    linkSuggestions: PriceReviewLinkSuggestion[];
    // Tiendas de referencia vinculadas, de la más barata a la más cara
    references: PriceReviewReference[];
    // Precio vigente más bajo entre las referencias con stock (si ninguna tiene, entre todas)
    bestReferencePrice: number | null;
    // Nuestro precio contra esa referencia: (nuestro − suyo) / suyo; positivo = somos más caros
    referenceDiff: number | null;
}

export interface PriceReviewResult {
    rows: PriceReviewRow[];
    total: number;
    page: number;
    totalPages: number;
    // Resumen sobre todos los productos del filtro (no sólo la página)
    summary: {
        linked: number;
        unlinked: number;
        belowMin: number;
        belowTarget: number;
        noStock: number;
        // Productos con sugerencias de vínculo pendientes
        withSuggestions: number;
        // Contra las tiendas de referencia (ver REFERENCE_* en lib/priceReview.ts)
        refExpensive: number;
        refCheaper: number;
    };
}

export interface CategoryMarginDTO {
    id: string;
    name: string;
    parentId: string | null;
    depth: number;
    targetMarginPercent: number | null;
    minMarginPercent: number | null;
}
