import type { ReferenceProductData } from "./jsonLdProduct";
import type { CatalogReferenceSource } from "./sources";

/**
 * Lector de catálogos JSON con la forma del de Compra Gamer (`static.compragamer.com/productos`):
 * un arreglo con todos los productos, cada uno con `id_producto`, `nombre`, `precioEspecial`
 * (contado), `precioLista`, `stock`, `vendible` y `codigo_principal` (["SKU: …"]).
 */
export interface CatalogEntry {
    externalId: string;
    url: string;
    data: ReferenceProductData;
}

type Raw = Record<string, unknown>;

// Categoría de combos de su tienda (kits, PCs armadas): no se comparan, como los combos propios
export const CATALOG_COMBO_CATEGORY = 55;
// Paquetes sueltos ("Notebook … + Mouse G305"): llevan el código de uno de sus componentes
const BUNDLE_NAME = / \+ /;

const isObject = (value: unknown): value is Raw =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const num = (value: unknown): number | null => {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
};

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Igual que `Product.generateUrl` de su tienda: el nombre con `_` en vez de símbolos y el ID */
export function buildCatalogProductUrl(baseUrl: string, id: string, name: string): string {
    const slug = name.trim().replace(/[^\w]+/gi, "_");
    return `${baseUrl}/producto/${slug}_${id}`;
}

/**
 * Códigos de `codigo_principal` (["SKU: TCA-1200NV", "EAN: 779…"]): SKU / part number y EAN.
 * Sin prefijo conocido, el valor se toma como SKU.
 */
export function parseCatalogCodes(value: unknown): { sku: string; gtin: string } {
    let sku = "";
    let gtin = "";
    const entries = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (const entry of entries) {
        const text = str(entry);
        if (!text) continue;
        const match = /^([A-Za-z/ .]+?)\s*:\s*(.+)$/.exec(text);
        const label = match ? match[1].toLowerCase().replace(/[^a-z]/g, "") : "";
        const code = (match ? match[2] : text).trim();
        if (["ean", "gtin", "upc", "ean13"].includes(label)) gtin ||= code;
        else sku ||= code;
    }
    return { sku, gtin };
}

/**
 * Un producto del catálogo, o null si no sirve como referencia: sin precio, combo, outlet
 * (unidades con fallas, quedarían como la referencia más barata) o que sólo se vende dentro de
 * combos o del armador de PC. Los paquetes con " + " en el nombre quedan sin código, para que
 * la vinculación automática no los confunda con el producto suelto.
 */
export function mapCatalogProduct(raw: unknown, source: CatalogReferenceSource): CatalogEntry | null {
    if (!isObject(raw)) return null;
    const id = raw.id_producto;
    const name = str(raw.nombre);
    const price = num(raw.precioEspecial);
    if ((typeof id !== "number" && typeof id !== "string") || !name || !price) return null;
    if (
        Number(raw.id_categoria) === CATALOG_COMBO_CATEGORY ||
        raw.es_outlet === true ||
        raw.visible_solo_en_ATPC === true ||
        raw.visible_solo_en_combo === true
    ) {
        return null;
    }

    const externalId = String(id);
    const listPrice = num(raw.precioLista);
    const { sku, gtin } = BUNDLE_NAME.test(name)
        ? { sku: "", gtin: "" }
        : parseCatalogCodes(raw.codigo_principal);
    const images = Array.isArray(raw.imagenes) ? raw.imagenes.filter(isObject) : [];
    const firstImage = images.sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0))[0];
    const imageName = firstImage ? str(firstImage.nombre) : "";

    return {
        externalId,
        url: buildCatalogProductUrl(source.baseUrl, externalId, name),
        data: {
            name,
            sku,
            gtin,
            brand: "",
            image: imageName ? `${source.imageBaseUrl}${imageName}-mini.jpg` : null,
            price,
            listPrice: listPrice && listPrice > price ? listPrice : price,
            currency: "ARS",
            inStock: Number(raw.vendible) === 1 && (num(raw.stock) ?? 0) > 0,
            categoryPath: [],
        },
    };
}

/** Productos válidos del catálogo (acepta el arreglo o un objeto que lo envuelva en `data`) */
export function parseCatalog(json: unknown, source: CatalogReferenceSource): CatalogEntry[] {
    const list = Array.isArray(json) ? json : isObject(json) && Array.isArray(json.data) ? json.data : [];
    const byId = new Map<string, CatalogEntry>();
    for (const raw of list) {
        const entry = mapCatalogProduct(raw, source);
        if (entry) byId.set(entry.externalId, entry);
    }
    return [...byId.values()];
}
