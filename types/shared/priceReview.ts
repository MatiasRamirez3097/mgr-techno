import type { MarginStatus } from "@/lib/priceReview";
import type { DistributorKey } from "@/types/shared/distributorLink";

export type PriceReviewView = "linked" | "below_min" | "below_target" | "no_stock" | "unlinked" | "all";

export interface PriceReviewFilters {
    search?: string;
    categoryId?: string;
    status?: "publish" | "all";
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
}

export interface PriceReviewResult {
    rows: PriceReviewRow[];
    total: number;
    page: number;
    totalPages: number;
    // Resumen sobre todos los productos del filtro (no sólo la página)
    summary: { linked: number; unlinked: number; belowMin: number; belowTarget: number; noStock: number };
}

export interface CategoryMarginDTO {
    id: string;
    name: string;
    parentId: string | null;
    depth: number;
    targetMarginPercent: number | null;
    minMarginPercent: number | null;
}
