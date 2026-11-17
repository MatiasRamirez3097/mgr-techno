import { DISTRIBUTOR_KEYS, type DistributorKey } from "@/types/shared/distributorLink";

// Los resultados normalizados usan "Elit", "NewBytes", "INVID", "AIR"
export function toDistributorKey(distributor: string): DistributorKey | null {
    const key = distributor.trim().toLowerCase();
    return (DISTRIBUTOR_KEYS as readonly string[]).includes(key) ? (key as DistributorKey) : null;
}

// Clave de un resultado del comparador: distribuidor e ID propio, ej: "invid:12345"
export const distributorItemKey = (distributor: string, id: string | number) =>
    `${toDistributorKey(distributor) ?? distributor.toLowerCase()}:${id}`;

// Producto propio vinculado a un resultado del comparador
export interface LinkedProductRef {
    productId: string;
    productName: string;
}

export const DISTRIBUTOR_LABELS: Record<DistributorKey, string> = {
    elit: "Elit",
    newbytes: "NewBytes",
    invid: "Invid",
    air: "AIR",
    pcmodd: "PCMODD",
};

// Por debajo de este largo un código es demasiado genérico para vincular solo
export const MIN_MATCH_CODE_LENGTH = 5;

/**
 * Normaliza un part number para compararlo: mayúsculas y sin espacios, guiones ni
 * símbolos ("RTX-4060 8G" = "rtx40608g"). Devuelve "" si es muy corto para ser confiable.
 */
export function normalizePartNumber(value: string | null | undefined): string {
    const code = (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return code.length >= MIN_MATCH_CODE_LENGTH ? code : "";
}

// EAN/GTIN: sólo dígitos, de 8 a 14
export function normalizeEan(value: string | null | undefined): string {
    const digits = (value || "").replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 14 ? digits.replace(/^0+(?=\d{8})/, "") : "";
}

/**
 * Regex que encuentra un código ya normalizado en un campo sin normalizar, admitiendo
 * separadores entre caracteres: "RTX40608G" → /^[^A-Z0-9]*R[^A-Z0-9]*T…G[^A-Z0-9]*$/i
 */
export function buildLooseCodeRegex(normalizedCode: string): RegExp {
    const sep = "[^A-Za-z0-9]*";
    return new RegExp(`^${sep}${normalizedCode.split("").join(sep)}${sep}$`, "i");
}

// Códigos de un producto propio que pueden coincidir con el part number del distribuidor
export function productMatchCodes(product: { mpn?: string | null; sku?: string | null }): string[] {
    return [...new Set([normalizePartNumber(product.mpn), normalizePartNumber(product.sku)].filter(Boolean))];
}

export interface CodeMatchProduct {
    mpn?: string | null;
    sku?: string | null;
    gtin?: string | null;
}

export interface CodeMatchItem {
    distributor: DistributorKey;
    partNumber: string;
    ean: string;
}

export type CodeMatch<I> = { item: I; method: "part_number" | "ean"; matchedValue: string };

/**
 * Candidatos de un producto entre ítems de distribuidores, por coincidencia exacta de
 * part number normalizado (contra mpn o sku) o de EAN (contra gtin). Agrupa por distribuidor.
 */
export function findCodeMatches<I extends CodeMatchItem>(
    product: CodeMatchProduct,
    items: I[],
): Map<DistributorKey, CodeMatch<I>[]> {
    const codes = new Set(productMatchCodes(product));
    const ean = normalizeEan(product.gtin);
    const result = new Map<DistributorKey, CodeMatch<I>[]>();

    for (const item of items) {
        const partNumber = normalizePartNumber(item.partNumber);
        let match: CodeMatch<I> | null = null;
        if (partNumber && codes.has(partNumber)) {
            match = { item, method: "part_number", matchedValue: item.partNumber };
        } else if (ean && normalizeEan(item.ean) === ean) {
            match = { item, method: "ean", matchedValue: item.ean };
        }
        if (!match) continue;
        const list = result.get(item.distributor) ?? [];
        list.push(match);
        result.set(item.distributor, list);
    }
    return result;
}

/** Índice por código normalizado para cruzar muchos productos contra un catálogo grande. */
export function indexItemsByCode<I extends CodeMatchItem>(items: I[]): Map<string, I[]> {
    const index = new Map<string, I[]>();
    const add = (key: string, item: I) => {
        const list = index.get(key) ?? [];
        list.push(item);
        index.set(key, list);
    };
    for (const item of items) {
        const partNumber = normalizePartNumber(item.partNumber);
        if (partNumber) add(`pn:${partNumber}`, item);
        const ean = normalizeEan(item.ean);
        if (ean) add(`ean:${ean}`, item);
    }
    return index;
}

/** Ítems candidatos de un producto usando un índice de indexItemsByCode. */
export function candidatesFromIndex<I extends CodeMatchItem>(
    product: CodeMatchProduct,
    index: Map<string, I[]>,
): I[] {
    const keys = productMatchCodes(product).map((c) => `pn:${c}`);
    const ean = normalizeEan(product.gtin);
    if (ean) keys.push(`ean:${ean}`);
    return [...new Set(keys.flatMap((k) => index.get(k) ?? []))];
}

// Invid puede informar sólo una leyenda ("Stock bajo"); AIR, "Sin stock en ROS (...)"
export const hasDistributorStock = (stock: number | null | undefined, label: string | null | undefined) =>
    (stock ?? 0) > 0 || Boolean(label && !/^sin stock/i.test(label));

// Variación mínima de costo que se registra como cambio (evita ruido por redondeos)
export const LINK_PRICE_CHANGE_RECORD_THRESHOLD = 0.005;

export interface LinkSnapshotState {
    lastPrice?: number | null;
    missingSince?: Date | null;
}

export interface LinkSnapshotItem {
    name: string;
    price: number;
    stock: number;
    link: string | null;
    image: string | null;
}

/**
 * Campos a guardar en un vínculo tras consultar el catálogo del distribuidor. `item` null =
 * el producto ya no está (sólo debe pasarse si la consulta fue completa). Devuelve también el
 * cambio de costo, si lo hubo.
 */
export function buildLinkSnapshotUpdate(
    link: LinkSnapshotState,
    item: LinkSnapshotItem | null,
    now: Date,
): { set: Record<string, unknown>; priceChange: { previous: number; current: number; change: number } | null } {
    if (!item) {
        return {
            set: { lastStock: 0, lastStockLabel: null, lastCheckedAt: now, missingSince: link.missingSince ?? now },
            priceChange: null,
        };
    }

    const set: Record<string, unknown> = {
        name: item.name,
        lastPrice: item.price,
        lastStock: item.stock,
        lastStockLabel: null,
        lastCheckedAt: now,
        missingSince: null,
        ...(item.link ? { link: item.link } : {}),
        ...(item.image ? { image: item.image } : {}),
    };

    const previous = Number(link.lastPrice) || 0;
    let priceChange = null;
    if (previous > 0 && item.price > 0) {
        const change = (item.price - previous) / previous;
        if (Math.abs(change) >= LINK_PRICE_CHANGE_RECORD_THRESHOLD) {
            set.previousPrice = previous;
            set.priceChangedAt = now;
            priceChange = { previous, current: item.price, change };
        }
    }
    return { set, priceChange };
}

/** Margen sobre el costo: (precio − costo) / costo. null si no hay costo. */
export function marginOverCost(price: number, cost: number | null | undefined): number | null {
    if (!cost || cost <= 0) return null;
    return (price - cost) / cost;
}
