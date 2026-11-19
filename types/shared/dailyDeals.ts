import type { DistributorKey } from "./distributorLink";

/**
 * Grupo de reglas de las ofertas del día. Dentro de un grupo los filtros se cruzan (el producto
 * tiene que cumplir todos); entre grupos se suman. Los grupos se llenan en orden, cada uno hasta
 * su cupo. Un filtro vacío no restringe.
 */
export interface DailyDealGroupDTO {
    id: string;
    name: string;
    // Proveedores: el producto tiene que tener un costo utilizable de alguno de éstos
    distributors: DistributorKey[];
    // Categorías (incluye sus subcategorías)
    categoryIds: string[];
    brandIds: string[];
    // Máximo de productos de este grupo (null = sin límite)
    maxProducts: number | null;
}

export interface DailyDealSettingsDTO {
    enabled: boolean;
    // Cantidad de productos en oferta por día
    productCount: number;
    // Un producto que salió en los últimos N días no se repite (salvo que no alcancen)
    noRepeatDays: number;
    // Utilidad mínima sobre el costo ANTES del descuento, en %
    minMarginPercent: number;
    // Descuento sobre el precio normal, en %
    discountPercent: number;
    // true: sólo con stock en un distribuidor vinculado (PCMODD, que no informa stock, cuenta como
    // con stock). false: alcanza con un costo conocido aunque ningún distribuidor tenga stock.
    requireDistributorStock: boolean;
    groups: DailyDealGroupDTO[];
}

// Por qué un producto no participa
export type DailyDealExclusionReason = "on_sale" | "no_cost" | "no_stock" | "low_margin" | "no_deal_price";

export interface DailyDealPreviewItem {
    productId: string;
    name: string;
    sku: string;
    slug: string;
    image: string | null;
    groupId: string;
    groupName: string;
    regularPrice: number;
    dealPrice: number;
    cost: number;
    costDistributor: DistributorKey;
    // Sin stock en el distribuidor (sólo posible con requireDistributorStock apagado)
    costWithoutStock: boolean;
    marginPercent: number;
    dealMarginPercent: number;
    // Ya salió dentro de los días sin repetir (se usó porque no alcanzaban los productos)
    repeated: boolean;
    lastFeaturedOn: string | null;
}

export interface DailyDealGroupStats {
    groupId: string;
    groupName: string;
    // Productos que cumplen margen, costo y stock y además los filtros del grupo
    matching: number;
    // De esos, los que no salieron en los días sin repetir
    fresh: number;
    picked: number;
}

export interface DailyDealPreviewResult {
    date: string;
    items: DailyDealPreviewItem[];
    groups: DailyDealGroupStats[];
    // Productos publicados y visibles evaluados
    evaluated: number;
    eligible: number;
    excluded: Record<DailyDealExclusionReason, number>;
    // Cuántos faltaron para llegar a la cantidad pedida
    shortfall: number;
}
