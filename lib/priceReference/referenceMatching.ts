import { normalizeEan, normalizePartNumber, productMatchCodes } from "@/lib/distributors/productLinks";
import { findNameMatches, type NameIndex } from "@/lib/distributors/nameMatching";

/**
 * Coincidencias entre productos propios e ítems de las tiendas de referencia. Las tiendas suelen
 * publicar el part number del fabricante como SKU, así que se cruza contra mpn/sku del producto;
 * el GTIN, contra el EAN. Sin coincidencia por código, se sugiere por nombre parecido.
 */
export interface ReferenceMatchItem {
    id: string;
    source: string;
    name: string;
    sku: string;
    gtin: string;
}

export interface ReferenceMatchProduct {
    name: string;
    mpn?: string | null;
    sku?: string | null;
    gtin?: string | null;
}

export interface ReferenceMatch<I> {
    item: I;
    method: "part_number" | "ean" | "name";
    matchedValue: string;
    score: number;
}

// Máximo de sugerencias por nombre por tienda
export const MAX_REFERENCE_NAME_SUGGESTIONS = 2;

/** Índice por código normalizado (`pn:` / `ean:`) para cruzar muchos productos */
export function indexReferenceItemsByCode<I extends ReferenceMatchItem>(items: I[]): Map<string, I[]> {
    const index = new Map<string, I[]>();
    const add = (key: string, item: I) => index.set(key, [...(index.get(key) ?? []), item]);
    for (const item of items) {
        const partNumber = normalizePartNumber(item.sku);
        if (partNumber) add(`pn:${partNumber}`, item);
        const ean = normalizeEan(item.gtin);
        if (ean) add(`ean:${ean}`, item);
    }
    return index;
}

/** Coincidencias exactas por código de un producto, agrupadas por tienda */
export function findReferenceCodeMatches<I extends ReferenceMatchItem>(
    product: ReferenceMatchProduct,
    index: Map<string, I[]>,
): Map<string, ReferenceMatch<I>[]> {
    const result = new Map<string, ReferenceMatch<I>[]>();
    const seen = new Set<string>();
    const add = (item: I, method: "part_number" | "ean", matchedValue: string) => {
        if (seen.has(item.id)) return;
        seen.add(item.id);
        result.set(item.source, [
            ...(result.get(item.source) ?? []),
            { item, method, matchedValue, score: 1 },
        ]);
    };

    for (const code of productMatchCodes(product)) {
        for (const item of index.get(`pn:${code}`) ?? []) add(item, "part_number", item.sku);
    }
    const ean = normalizeEan(product.gtin);
    if (ean) {
        for (const item of index.get(`ean:${ean}`) ?? []) add(item, "ean", item.gtin);
    }
    return result;
}

/**
 * Sugerencias para un producto en las tiendas indicadas: por código y, en las tiendas sin
 * coincidencia por código, hasta MAX_REFERENCE_NAME_SUGGESTIONS por nombre parecido.
 */
export function suggestReferenceMatches<I extends ReferenceMatchItem>(
    product: ReferenceMatchProduct,
    codeIndex: Map<string, I[]>,
    nameIndex: NameIndex<I>,
    sources: string[],
): ReferenceMatch<I>[] {
    const wanted = new Set(sources);
    const result: ReferenceMatch<I>[] = [];

    const byCode = findReferenceCodeMatches(product, codeIndex);
    for (const [source, matches] of byCode) {
        if (wanted.has(source)) result.push(...matches);
    }

    const perSource = new Map<string, number>();
    const nameMatches = findNameMatches(product.name, nameIndex, {
        limit: 20,
        filter: (item) => wanted.has(item.source) && !byCode.has(item.source),
    });
    for (const { item, score } of nameMatches) {
        const count = perSource.get(item.source) ?? 0;
        if (count >= MAX_REFERENCE_NAME_SUGGESTIONS) continue;
        perSource.set(item.source, count + 1);
        result.push({ item, method: "name", matchedValue: "", score: Math.round(score * 100) / 100 });
    }
    return result;
}

/**
 * Diferencia del precio propio contra el de la tienda: (propio − tienda) / tienda.
 * Positiva = somos más caros. null si falta alguno de los dos.
 */
export function referencePriceDiff(own: number | null | undefined, reference: number | null | undefined): number | null {
    if (!own || own <= 0 || !reference || reference <= 0) return null;
    return (own - reference) / reference;
}
