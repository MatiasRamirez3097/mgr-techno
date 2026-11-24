/**
 * Normalización de códigos leídos con el escáner (código de barras de la caja).
 * Un mismo producto puede venir como UPC-A (12 dígitos) o EAN-13 (13, con un 0 adelante),
 * así que para GTIN se prueban las variantes con y sin ceros a la izquierda.
 */

export type ProductCodeField = "gtin" | "sku" | "mpn";

/** Saca espacios y caracteres de control que agregan algunos lectores. */
export function normalizeScanCode(raw: string): string {
    return raw.replace(/[\s\u0000-\u001f]+/g, "").trim();
}

/** GTIN-8, UPC-A (12), EAN-13 o GTIN-14: solo dígitos. */
export function isGtinLike(code: string): boolean {
    return /^(\d{8}|\d{12,14})$/.test(code);
}

/**
 * Variantes de un GTIN con distinta cantidad de ceros a la izquierda (8, 12, 13 y 14 dígitos),
 * para encontrar el producto sin importar con qué largo se cargó. Si no es numérico, devuelve
 * solo el código tal cual.
 */
export function gtinCandidates(code: string): string[] {
    if (!/^\d+$/.test(code)) return [code];
    const stripped = code.replace(/^0+/, "");
    if (!stripped) return [code];
    const variants = new Set<string>([code]);
    for (const length of [8, 12, 13, 14]) {
        if (stripped.length <= length) variants.add(stripped.padStart(length, "0"));
    }
    return Array.from(variants);
}

/**
 * Campo en el que conviene guardar un código nuevo: GTIN si parece uno; si no, no se puede
 * saber si es SKU o MPN y lo elige el usuario.
 */
export function suggestCodeField(code: string): ProductCodeField | null {
    return isGtinLike(code) ? "gtin" : null;
}
