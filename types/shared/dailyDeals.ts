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

/**
 * Escalón de descuento: los productos con al menos `minMarginPercent` de utilidad sobre el costo
 * (antes del descuento) llevan `discountPercent`. Se usa el escalón más alto que alcanza el
 * producto; por debajo del más bajo, no participa.
 */
export interface DailyDealDiscountTier {
    minMarginPercent: number;
    discountPercent: number;
}

export interface DailyDealSettingsDTO {
    enabled: boolean;
    // Cantidad de productos en oferta por día
    productCount: number;
    // Un producto que salió en los últimos N días no se repite (salvo que no alcancen)
    noRepeatDays: number;
    // Escalones de utilidad → descuento, ordenados por utilidad mínima creciente (al menos uno)
    discountTiers: DailyDealDiscountTier[];
    // true: sólo con stock en un distribuidor vinculado (PCMODD, que no informa stock, cuenta como
    // con stock). false: alcanza con un costo conocido aunque ningún distribuidor tenga stock.
    requireDistributorStock: boolean;
    // Día (YYYY-MM-DD) desde el que empiezan las ofertas, a las 00:00; null = ya empezaron
    startDate: string | null;
    groups: DailyDealGroupDTO[];
    // Dentro de cada grupo, sortear primero los productos de "Stock a rotar"
    prioritizeRotation: boolean;
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
    // Descuento del escalón que le tocó
    discountPercent: number;
    marginPercent: number;
    dealMarginPercent: number;
    // Ya salió dentro de los días sin repetir (se usó porque no alcanzaban los productos)
    repeated: boolean;
    lastFeaturedOn: string | null;
    // Está en "Stock a rotar" (y se priorizó por eso)
    rotation: boolean;
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

// Tanda de ofertas de un día, para el admin
export interface DailyDealItemDTO {
    productId: string;
    name: string;
    slug: string;
    regularPrice: number;
    dealPrice: number;
    cost: number;
    costDistributor: DistributorKey;
    groupId: string;
    repeated: boolean;
    // Al terminar: si se le restauró el precio (false = el admin lo había cambiado)
    restored: boolean;
    // En la tanda activa: el admin le cambió el precio durante el día (no se va a restaurar)
    priceChanged: boolean;
}

export interface DailyDealDTO {
    date: string;
    startsAt: string;
    endsAt: string;
    status: "active" | "finished" | "cancelled";
    items: DailyDealItemDTO[];
}

export interface DailyDealsOverview {
    today: string;
    current: DailyDealDTO | null;
    history: DailyDealDTO[];
}

// Oferta vigente para la tienda: sólo lo necesario para la cuenta regresiva
export interface ActiveDailyDeal {
    endsAt: string;
    productIds: string[];
}
