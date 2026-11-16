export const DISTRIBUTOR_KEYS = ["elit", "newbytes", "invid", "air"] as const;
export type DistributorKey = (typeof DISTRIBUTOR_KEYS)[number];

// Cómo se vinculó: coincidencia exacta de part number / EAN, o elegido a mano
export type DistributorLinkMatchMethod = "part_number" | "ean" | "manual";

// Vínculo entre un producto propio y su equivalente en un distribuidor
export interface ProductDistributorLinkDTO {
    id: string;
    productId: string;
    distributor: DistributorKey;
    // ID propio del distribuidor (Invid: invidId, AIR: Codigo, Elit/NewBytes: id de la API)
    distributorProductId: string;
    distributorSku: string;
    name: string;
    link: string | null;
    image: string | null;
    matchMethod: DistributorLinkMatchMethod;
    // Último costo visto, en ARS con IVA (los distribuidores en USD ya convertidos)
    lastPrice: number | null;
    lastStock: number | null;
    lastStockLabel: string | null;
    lastCheckedAt: string | null;
    // false si el ítem ya no está en el catálogo local del distribuidor (Invid, AIR)
    available: boolean;
    createdAt: string;
}

// Datos para crear un vínculo (vienen de un resultado normalizado del comparador)
export interface CreateDistributorLinkInput {
    distributor: string;
    distributorProductId: string;
    distributorSku?: string;
    name: string;
    link?: string | null;
    image?: string | null;
    price?: number | null;
    stock?: number | null;
    stockLabel?: string | null;
    matchMethod?: DistributorLinkMatchMethod;
}

// Candidato sugerido para vincular, con el motivo de la coincidencia
export interface DistributorLinkSuggestion {
    distributor: DistributorKey;
    distributorProductId: string;
    distributorSku: string;
    name: string;
    link: string | null;
    image: string | null;
    price: number;
    stock: number;
    stockLabel?: string;
    matchMethod: Exclude<DistributorLinkMatchMethod, "manual">;
    // Valor que coincidió (part number o EAN)
    matchedValue: string;
}

export interface AutoLinkReport {
    linked: number;
    // Productos con más de un candidato en un mismo distribuidor: se resuelven a mano
    ambiguous: { productId: string; productName: string; distributor: DistributorKey; candidates: number }[];
    scannedProducts: number;
}
