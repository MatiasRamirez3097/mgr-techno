import { normalizeSearch } from "@/lib/search/normalize";

// Depósito de AIR cuyo stock se usa en el comparador y en presupuestos (Rosario)
export const AIR_STOCK_WAREHOUSE = "ROS";
export const AIR_WAREHOUSES = ["ROS", "MZA", "CBA", "LUG"] as const;
export type AirWarehouse = (typeof AIR_WAREHOUSES)[number];

// Fila de la lista CSV de la intranet de AIR, con las columnas tal como vienen
export type AirRawRow = Record<string, string>;

// Rubros (categorías) y grupos (marcas) de /cache/rubros.txt
export interface AirRubrosData {
    rubros: Map<string, string>;
    grupos: Map<string, string>;
}

export interface AirCatalogItemData {
    airId: string;
    title: string;
    partNumber: string;
    brandId: string;
    brand: string;
    categoryId: string;
    category: string;
    // Precio de lista sin IVA y precio con IVA, en USD
    price: number;
    finalPrice: number;
    ivaPercent: number;
    currency: string;
    stock: number;
    stockByWarehouse: Record<AirWarehouse, number>;
    // Columna "Tipo" de la lista; se guarda pero todavía no se usa
    type: string;
    searchText: string;
}

/**
 * La lista se informa como UTF-8 pero suele venir en Windows-1252: se intenta UTF-8
 * estricto y, si falla, se decodifica como Windows-1252.
 */
export function decodeAirText(buffer: ArrayBuffer | Uint8Array): string {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
        return new TextDecoder("windows-1252").decode(buffer);
    }
}

// Todos los campos vienen entre comillas, pero las comillas internas no se escapan
// (ej: "PANEL 19",5.96""), así que se separa por `","` en lugar de usar un parser CSV
function splitAirLine(line: string): string[] | null {
    const trimmed = line.trim();
    const start = trimmed.indexOf('"');
    if (start === -1 || !trimmed.endsWith('"') || trimmed.length - start < 2) return null;
    return trimmed.slice(start + 1, -1).split('","');
}

/**
 * Convierte el CSV de la intranet en filas indexadas por el nombre de columna.
 * Las filas con una cantidad de columnas distinta al encabezado se descartan.
 */
export function parseAirCsv(text: string): { rows: AirRawRow[]; skipped: number } {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    // El encabezado puede traer uno o más BOM antes de la primera comilla
    const header = lines.length > 0 ? splitAirLine(lines[0]) : null;
    if (!header) return { rows: [], skipped: 0 };

    const columns = header.map((h) => h.trim());
    const rows: AirRawRow[] = [];
    let skipped = 0;

    for (const line of lines.slice(1)) {
        const values = splitAirLine(line);
        if (!values || values.length !== columns.length) {
            skipped++;
            continue;
        }
        rows.push(Object.fromEntries(columns.map((c, i) => [c, values[i].trim()])));
    }

    return { rows, skipped };
}

const toNumber = (value: string | undefined) => {
    const n = Number((value || "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Normaliza una fila de la lista. Devuelve null si no tiene código o precio.
 * El precio de lista es sin IVA: se le suma la alícuota de la columna IVA.
 */
export function mapAirRow(
    raw: AirRawRow,
    names: AirRubrosData = { rubros: new Map(), grupos: new Map() },
): AirCatalogItemData | null {
    const airId = (raw["Codigo"] || "").trim();
    const price = toNumber(raw["lista3"]);
    if (!airId || price <= 0) return null;

    const title = (raw["Descripcion"] || "").replace(/\s+/g, " ").trim();
    const ivaPercent = toNumber(raw["IVA"]);
    const partNumber = (raw["Part Number"] || "").trim();
    const brandId = (raw["Grupo"] || "").trim();
    const categoryId = (raw["Rubro"] || "").trim();
    const brand = names.grupos.get(brandId) || "";

    const stockByWarehouse = Object.fromEntries(
        AIR_WAREHOUSES.map((w) => [w, Math.max(0, Math.trunc(toNumber(raw[w])))]),
    ) as Record<AirWarehouse, number>;

    return {
        airId,
        title,
        partNumber,
        brandId,
        brand,
        categoryId,
        category: names.rubros.get(categoryId) || categoryId,
        price,
        finalPrice: round2(price * (1 + ivaPercent / 100)),
        ivaPercent,
        currency: "USD",
        stock: stockByWarehouse[AIR_STOCK_WAREHOUSE],
        stockByWarehouse,
        type: (raw["Tipo"] || "").trim(),
        searchText: normalizeSearch([title, brand, partNumber, airId].join(" ")),
    };
}

/**
 * Lee /cache/rubros.txt: un JSON con los rubros y, dentro de cada uno, sus grupos (marcas).
 */
export function parseAirRubros(text: string): AirRubrosData {
    const rubros = new Map<string, string>();
    const grupos = new Map<string, string>();

    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        return { rubros, grupos };
    }
    if (!Array.isArray(data)) return { rubros, grupos };

    for (const rubro of data as { id?: unknown; name?: unknown; grupos?: unknown }[]) {
        const id = String(rubro?.id ?? "").trim();
        const name = typeof rubro?.name === "string" ? rubro.name.trim() : "";
        // id 0 es la opción "Todos los Rubros" / "Todos los Grupos"
        if (id && id !== "0" && name) rubros.set(id, name);

        if (!Array.isArray(rubro?.grupos)) continue;
        for (const grupo of rubro.grupos as { id?: unknown; name?: unknown }[]) {
            const grupoId = String(grupo?.id ?? "").trim();
            const grupoName = typeof grupo?.name === "string" ? grupo.name.trim() : "";
            if (grupoId && grupoId !== "0" && grupoName) grupos.set(grupoId, grupoName);
        }
    }

    return { rubros, grupos };
}

// Una lista con menos de la mitad de artículos que la anterior se considera incompleta
// (ej: la intranet aplicó otro filtro) y no se importa, para no marcar el resto como no disponible
export const AIR_MIN_LIST_RATIO = 0.5;
const AIR_MIN_PREVIOUS_ITEMS = 200;

export function isIncompleteAirList(items: number, previousItems: number | null | undefined): boolean {
    if (!previousItems || previousItems < AIR_MIN_PREVIOUS_ITEMS) return false;
    return items < previousItems * AIR_MIN_LIST_RATIO;
}

// Leyenda cuando no hay unidades en el depósito que usamos pero sí en otros
// (empieza con "Sin stock" para que el comparador no lo muestre como disponible)
export function getAirStockLabel(
    stockByWarehouse: Partial<Record<AirWarehouse, number>> | null | undefined,
): string | undefined {
    const own = stockByWarehouse?.[AIR_STOCK_WAREHOUSE] || 0;
    if (own > 0) return undefined;
    const others = AIR_WAREHOUSES.filter((w) => w !== AIR_STOCK_WAREHOUSE).reduce(
        (sum, w) => sum + (stockByWarehouse?.[w] || 0),
        0,
    );
    return others > 0 ? `Sin stock en ${AIR_STOCK_WAREHOUSE} (otros depósitos: ${others})` : undefined;
}
