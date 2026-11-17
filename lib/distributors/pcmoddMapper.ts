import { parseInvidNumber } from "./invidMapper";
import { normalizeSearch } from "@/lib/search/normalize";

/**
 * Lista de precios de PCMODD: una hoja de Google Sheets pública (link en PCMODD_SHEET_URL, que no
 * va en el código). Columnas: A = producto, B = precio en USD sin IVA ("$1.234,56"), C = alícuota
 * de IVA ("21,00" / "10,50"). Está agrupada por marca: una fila con la marca en A (y títulos o nada
 * en B) encabeza sus productos, hasta la marca siguiente. Hay filas en blanco entre grupos.
 * No informa stock ni códigos.
 */
export const PCMODD_STOCK_LABEL = "Stock sin informar";

export interface PcmoddCatalogItemData {
    // Marca + nombre normalizados: la hoja no tiene código propio
    pcmoddId: string;
    title: string;
    brand: string;
    // USD sin IVA y con IVA
    price: number;
    finalPrice: number;
    ivaPercent: number;
    currency: "USD";
    // Posición en la hoja (para ordenar como la ven ellos)
    row: number;
    searchText: string;
}

/**
 * Costo en USD de un producto: precio + IVA de la columna C, o el precio tal cual si la
 * configuración dice que no se tome en cuenta esa columna.
 */
export function pcmoddFinalPrice(price: number, ivaPercent: number, applyIva: boolean): number {
    return applyIva ? Math.round(price * (1 + ivaPercent / 100) * 100) / 100 : price;
}

/** CSV (RFC 4180): comillas dobles, comas y saltos de línea dentro de campos entre comillas */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                quoted = false;
            } else {
                field += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }
    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

/**
 * URL de descarga en CSV a partir del link de la hoja (el que se copia del navegador, con la
 * pestaña abierta: `…/d/<id>/edit?gid=<gid>#gid=<gid>`). Sin gid, la primera pestaña.
 */
export function buildSheetCsvUrl(sheetUrl: string): string | null {
    const id = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(sheetUrl)?.[1];
    if (!id) return null;
    const gid = /[?#&]gid=(\d+)/.exec(sheetUrl)?.[1] ?? "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

const hasDigits = (value: string) => /\d/.test(value);
// Precio válido: sólo número con separadores, opcionalmente con "$", "U$S" o "USD" adelante
const PRICE_TEXT = /^(?:u\$s|usd|\$)?\s*\d[\d.,]*$/i;

/** ID estable de un producto: marca y nombre normalizados (si cambian el nombre, es otro ítem) */
export const pcmoddItemId = (brand: string, title: string) =>
    normalizeSearch(`${brand} ${title}`).replace(/\s+/g, "-").slice(0, 200);

/**
 * Lee la hoja. Una fila es producto si tiene nombre en A y un precio válido en B; si tiene texto
 * en A pero no precio en B, es el encabezado de una marca. Las filas con precio pero sin marca
 * previa quedan con marca vacía. `skipped` cuenta filas con nombre y algo en B que no se pudo leer.
 */
export function parsePcmoddSheet(
    csv: string,
    { applyIva = true }: { applyIva?: boolean } = {},
): { items: PcmoddCatalogItemData[]; skipped: number } {
    const items: PcmoddCatalogItemData[] = [];
    const seen = new Set<string>();
    let brand = "";
    let skipped = 0;

    parseCsv(csv).forEach((cells, index) => {
        const name = (cells[0] ?? "").trim().replace(/\s+/g, " ");
        const priceText = (cells[1] ?? "").trim();
        const ivaText = (cells[2] ?? "").trim();
        if (!name) return;

        const price = PRICE_TEXT.test(priceText) ? parseInvidNumber(priceText) : 0;
        if (price <= 0) {
            if (hasDigits(priceText)) {
                skipped++;
                return;
            }
            // Encabezado de marca ("ID-COOLING", con "USD" / "IVA" como títulos en B y C)
            brand = name;
            return;
        }

        const ivaPercent = hasDigits(ivaText) ? parseInvidNumber(ivaText) : 0;
        const id = pcmoddItemId(brand, name);
        if (!id || seen.has(id)) {
            skipped++;
            return;
        }
        seen.add(id);

        // La búsqueda y la coincidencia por nombre usan la marca aunque el nombre no la tenga
        const withBrand = brand && !normalizeSearch(name).includes(normalizeSearch(brand)) ? `${brand} ${name}` : name;
        items.push({
            pcmoddId: id,
            title: name,
            brand,
            price,
            finalPrice: pcmoddFinalPrice(price, ivaPercent, applyIva),
            ivaPercent,
            currency: "USD",
            row: index + 1,
            searchText: normalizeSearch(withBrand),
        });
    });

    return { items, skipped };
}

/** Nombre para mostrar: con la marca entre paréntesis si el nombre no la incluye */
export function pcmoddDisplayName(title: string, brand: string): string {
    return brand && !title.toLowerCase().includes(brand.toLowerCase()) ? `${title} (${brand})` : title;
}
