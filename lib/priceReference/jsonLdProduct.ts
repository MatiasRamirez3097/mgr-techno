/**
 * Extrae los datos de producto que publica una página en JSON-LD (schema.org/Product),
 * como hacen WooCommerce y la mayoría de las tiendas para Google Shopping.
 */
export interface ReferenceProductData {
    name: string;
    sku: string;
    gtin: string;
    brand: string;
    image: string | null;
    /** Precio de venta vigente (el de oferta si la hay) */
    price: number;
    /** Precio de lista; igual a `price` si la página no informa uno distinto */
    listPrice: number;
    currency: string;
    inStock: boolean;
    /** Categorías del breadcrumb, de la más general a la más específica (sin el producto) */
    categoryPath: string[];
}

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] =>
    value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

const hasType = (node: JsonObject, type: string) =>
    asArray(node["@type"]).some((t) => typeof t === "string" && t.toLowerCase() === type.toLowerCase());

const text = (value: unknown): string => {
    if (typeof value === "string") return decodeEntities(value).trim();
    if (typeof value === "number") return String(value);
    if (isObject(value)) return text(value.name ?? value["@value"]);
    return "";
};

function decodeEntities(value: string): string {
    return value
        .replace(/&nbsp;|&#160;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/** Precio de schema.org: número o texto con punto decimal ("221200.00") */
export function parseSchemaPrice(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
    if (typeof value !== "string") return null;
    let cleaned = value.replace(/[^\d.,]/g, "");
    if (!cleaned) return null;
    // Si trae coma, se asume formato local (1.234,56)
    if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    const number = Number(cleaned);
    return Number.isFinite(number) && number > 0 ? number : null;
}

/** Bloques <script type="application/ld+json"> de la página, ya parseados */
export function extractJsonLdBlocks(html: string): unknown[] {
    const blocks: unknown[] = [];
    const regex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html))) {
        try {
            blocks.push(JSON.parse(match[1].trim()));
        } catch {
            // Algunos plugins dejan JSON inválido: se ignora ese bloque
        }
    }
    return blocks;
}

// Recorre los nodos de primer nivel y los de @graph
function collectNodes(blocks: unknown[]): JsonObject[] {
    const nodes: JsonObject[] = [];
    const visit = (value: unknown) => {
        for (const item of asArray(value)) {
            if (!isObject(item)) continue;
            nodes.push(item);
            if (item["@graph"]) visit(item["@graph"]);
        }
    };
    blocks.forEach(visit);
    return nodes;
}

interface OfferPrices {
    price: number | null;
    listPrice: number | null;
    currency: string;
    inStock: boolean | null;
}

function readOffer(offer: JsonObject): OfferPrices {
    let price: number | null = null;
    let listPrice: number | null = null;
    let currency = text(offer.priceCurrency);

    for (const spec of asArray(offer.priceSpecification)) {
        if (!isObject(spec)) continue;
        const value = parseSchemaPrice(spec.price);
        if (value === null) continue;
        currency ||= text(spec.priceCurrency);
        const priceType = text(spec.priceType).toLowerCase();
        if (priceType.endsWith("listprice") || priceType.endsWith("msrp")) {
            listPrice = value;
        } else {
            price = price === null ? value : Math.min(price, value);
        }
    }

    // `price` de la oferta es el vigente; AggregateOffer (productos variables) trae `lowPrice`
    price = parseSchemaPrice(offer.price) ?? price ?? parseSchemaPrice(offer.lowPrice);

    const availability = text(offer.availability).toLowerCase();
    const inStock = availability
        ? /instock|limitedavailability|onlineonly|instoreonly|preorder|presale/.test(availability)
        : null;

    return { price, listPrice, currency, inStock };
}

function readBreadcrumb(nodes: JsonObject[], productName: string): string[] {
    const breadcrumb = nodes.find((n) => hasType(n, "BreadcrumbList"));
    if (!breadcrumb) return [];
    const items = asArray(breadcrumb.itemListElement)
        .filter(isObject)
        .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
        .map((element) => text(element.name ?? element.item))
        .filter(Boolean);
    // El último suele ser el propio producto; "Inicio" a veces encabeza la lista
    if (items.length && items[items.length - 1] === productName) items.pop();
    if (items.length && /^(inicio|home|tienda)$/i.test(items[0])) items.shift();
    return items;
}

export function parseJsonLdProduct(html: string): ReferenceProductData | null {
    const nodes = collectNodes(extractJsonLdBlocks(html));
    const product = nodes.find((n) => hasType(n, "Product"));
    if (!product) return null;

    const name = text(product.name);
    if (!name) return null;

    const offers = asArray(product.offers).filter(isObject).map(readOffer);
    const prices = offers.map((o) => o.price).filter((p): p is number => p !== null);
    if (!prices.length) return null;
    const price = Math.min(...prices);
    const best = offers.find((o) => o.price === price)!;
    const listPrice = best.listPrice !== null && best.listPrice > price ? best.listPrice : price;
    const stockFlags = offers.map((o) => o.inStock).filter((s): s is boolean => s !== null);

    const image = asArray(product.image)
        .map((img) => (isObject(img) ? text(img.url ?? img.contentUrl) : text(img)))
        .find(Boolean);

    return {
        name,
        sku: text(product.sku) || text(product.mpn),
        gtin: text(product.gtin13 ?? product.gtin ?? product.gtin12 ?? product.gtin14 ?? product.gtin8),
        brand: text(product.brand),
        image: image || null,
        price,
        listPrice,
        currency: best.currency || "ARS",
        // Sin dato de disponibilidad se asume que está a la venta
        inStock: stockFlags.length ? stockFlags.some(Boolean) : true,
        categoryPath: readBreadcrumb(nodes, name),
    };
}
