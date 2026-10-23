// Producto de un distribuidor normalizado para el comparador y los presupuestos
export interface NormalizedProduct {
    id: number | string;
    distributor: string;
    sku: string;
    name: string;
    // Precio en ARS (los distribuidores en USD se convierten con la cotización vigente)
    price: number;
    stock: number;
    // Leyenda de stock cuando el distribuidor no informa cantidades (ej: "Stock bajo")
    stockLabel?: string;
    image: string | null;
    link: string | null;
    originalCategory?: string;
    // Precio en la moneda original del distribuidor, antes de convertir
    originalPrice?: number;
    originalCurrency?: string;
    exchangeRate?: number;
    taxRate?: number;
}

// Estado de la copia local del catálogo de un distribuidor (Invid, AIR)
export interface DistributorSyncStatusDTO {
    lastSuccessfulSyncAt: string | null;
    lastSyncStatus: "ok" | "partial" | "error" | "skipped" | null;
    lastSyncError: string | null;
    lastSyncItems: number;
    syncing: boolean;
    // Cupo de requests informado por el distribuidor (sólo Invid)
    rateLimitRemaining: number | null;
    rateLimitResetAt: string | null;
    catalogCount: number;
    usdRate: number | null;
    usdRateUpdatedAt: string | null;
}

// Categoría presente en un catálogo local, para el mapeo de categorías del comparador
export interface DistributorCategorySummary {
    id: string;
    name: string;
    parentName: string | null;
    count: number;
}
