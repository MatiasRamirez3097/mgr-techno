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
// Alícuota de IVA de la columna C ("21,00", "10,5", "21%"): sólo los productos la tienen
const IVA_TEXT = /^\d{1,2}(?:[.,]\d+)?\s*%?$/;
const NUMBER_ONLY = /^[\d\s.,$%]+$/;
// Títulos de columna que pueden aparecer en las filas de encabezado
const COLUMN_TITLE = /^(?:usd|u\$s|iva|precio|precios|producto|productos|descripci[oó]n)$/i;
/**
 * Línea que parece el nombre de una marca: corta, con letras y sin minúsculas ("LIAN LI",
 * "ID-COOLING", "3NSTAR"). Se usa sólo para celdas con más de una línea.
 */
const looksLikeBrand = (line: string) =>
    line.length <= 30 && /[A-Z]/.test(line) && !/[a-z]/.test(line) && line.split(/\s+/).length <= 3;

/**
 * Separa la celda de la columna A en nombre y marca siguiente: a veces la marca no está en una
 * fila propia sino en una segunda línea de la celda del último producto de la marca anterior
 * ("CPU COOLER X↵LIAN LI"); en la hoja se ve igual que una fila más, sin espacio arriba.
 */
function splitNameCell(cell: string): { name: string; nextBrand: string | null } {
    const lines = cell.split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean);
    const last = lines.at(-1);
    if (lines.length > 1 && last && looksLikeBrand(last)) {
        return { name: lines.slice(0, -1).join(" "), nextBrand: last };
    }
    return { name: lines.join(" "), nextBrand: null };
}

// Precio válido: sólo número con separadores, opcionalmente con "$", "U$S" o "USD" adelante
const PRICE_TEXT = /^(?:u\$s|usd|\$)?\s*\d[\d.,]*$/i;

/** ID estable de un producto: marca y nombre normalizados (si cambian el nombre, es otro ítem) */
export const pcmoddItemId = (brand: string, title: string) =>
    normalizeSearch(`${brand} ${title}`).replace(/\s+/g, "-").slice(0, 200);

/**
 * Lee la hoja. Una fila es producto si tiene nombre en A y un precio válido en B. Es encabezado de
 * marca si no tiene precio válido en B ni alícuota en C: la marca es el texto de A o, si A está
 * vacía (celda combinada o centrada en otra columna), el primer texto de la fila. Las filas con
 * precio pero sin marca previa quedan con marca vacía. Si la celda de un producto trae una segunda
 * línea con forma de marca, esa línea es la marca de los productos que siguen (ver splitNameCell).
 * `skipped` cuenta las filas con nombre, alícuota en C y algo en B que no se pudo leer como precio.
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
        const priceText = (cells[1] ?? "").trim();
        const ivaText = (cells[2] ?? "").trim();
        const price = PRICE_TEXT.test(priceText) ? parseInvidNumber(priceText) : 0;
        // En un encabezado con varias líneas, la marca es la última; en un producto, la última
        // línea con forma de marca abre el grupo siguiente
        const { name: cellName, nextBrand } = splitNameCell(cells[0] ?? "");
        const name = price > 0 ? cellName : (nextBrand ?? cellName);

        if (price <= 0 && !IVA_TEXT.test(ivaText)) {
            // Encabezado de marca ("ID-COOLING", con "USD" / "IVA" u otros títulos en B y C). Si la
            // marca no está en A, se toma el primer texto de la fila que no sea un número ni un título.
            const header =
                name ||
                cells
                    .map((c) => c.trim().replace(/\s+/g, " "))
                    .find((c) => c && !NUMBER_ONLY.test(c) && !COLUMN_TITLE.test(c));
            if (header && !COLUMN_TITLE.test(header)) brand = header;
            return;
        }
        if (!name) return;
        if (price <= 0) {
            if (hasDigits(priceText)) skipped++;
            return;
        }

        const ivaPercent = hasDigits(ivaText) ? parseInvidNumber(ivaText) : 0;
        const id = pcmoddItemId(brand, name);
        const rowBrand = brand;
        if (nextBrand) brand = nextBrand;
        if (!id || seen.has(id)) {
            skipped++;
            return;
        }
        seen.add(id);

        // La búsqueda y la coincidencia por nombre usan la marca aunque el nombre no la tenga
        const withBrand =
            rowBrand && !normalizeSearch(name).includes(normalizeSearch(rowBrand)) ? `${rowBrand} ${name}` : name;
        items.push({
            pcmoddId: id,
            title: name,
            brand: rowBrand,
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
