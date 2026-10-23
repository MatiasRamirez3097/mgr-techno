import { normalizeSearch } from "@/lib/search/normalize";

// Variación mínima del precio final (en la moneda de Invid) para considerarla un cambio de precio
export const INVID_PRICE_CHANGE_THRESHOLD = 0.02;

// Artículo tal como lo devuelve GET /api/v1/articulo.php
export interface InvidRawArticle {
    ID?: string | number;
    TITLE?: string | null;
    PRICE?: string | number | null;
    FINAL_PRICE?: string | number | null;
    CURRENCY?: string | null;
    PART_NUMBER?: string | null;
    EAN?: string | null;
    BRAND?: string | null;
    STOCK_STATUS?: string | null;
    STOCK?: number | string | null;
    IVA_PERCENT?: number | string | null;
    INTERNAL_TAX_PERCENT?: number | string | null;
    IMAGE_URL?: string | null;
    CATEGORY_ID?: string | number | null;
    CATEGORY?: string | null;
    CATEGORIES?: {
        ID?: string | number;
        NAME?: string;
        IS_PRIMARY?: boolean;
        PARENT?: { ID?: string | number; NAME?: string } | null;
    }[];
}

export interface InvidCatalogItemData {
    invidId: string;
    title: string;
    partNumber: string;
    ean: string;
    brand: string;
    price: number;
    finalPrice: number;
    ivaPercent: number;
    internalTaxPercent: number;
    currency: string;
    stock: number | null;
    stockStatus: string;
    available: boolean;
    imageUrl: string | null;
    categoryId: string;
    category: string;
    categories: {
        id: string;
        name: string;
        isPrimary: boolean;
        parentId: string | null;
        parentName: string | null;
    }[];
    categoryIds: string[];
    categoryNames: string[];
    searchText: string;
}

/**
 * Invid devuelve los importes como texto "formateado según la configuración numérica del sistema",
 * así que aceptamos tanto "1234.56" como "1.234,56" o "1,234.56".
 */
export function parseInvidNumber(value: unknown): number {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string") return 0;

    let str = value.replace(/[^\d.,-]/g, "");
    if (!str) return 0;

    const lastDot = str.lastIndexOf(".");
    const lastComma = str.lastIndexOf(",");

    if (lastDot !== -1 && lastComma !== -1) {
        // El separador que aparece último es el decimal
        if (lastComma > lastDot) {
            str = str.replace(/\./g, "").replace(",", ".");
        } else {
            str = str.replace(/,/g, "");
        }
    } else if (lastComma !== -1) {
        str = /^-?\d{1,3}(,\d{3})+$/.test(str)
            ? str.replace(/,/g, "")
            : str.replace(",", ".");
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(str) && str.split(".").length > 2) {
        // "1.234.567" sólo puede ser separador de miles
        str = str.replace(/\./g, "");
    }

    const parsed = Number(str);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function isUsdCurrency(currency: string | null | undefined): boolean {
    if (!currency) return false;
    return /^(usd|u\$s|us\$|u\$d|dolar|dólar)/i.test(currency.trim());
}

/**
 * STOCK sólo viene si la cuenta tiene permiso para verlo; si no, usamos STOCK_STATUS
 * ("Disponible", "Stock bajo", "Menos de 10 unidades" o "Sin stock").
 */
export function mapInvidStock(
    stock: unknown,
    stockStatus: unknown,
): { stock: number | null; stockStatus: string; available: boolean } {
    const status = typeof stockStatus === "string" ? stockStatus.trim() : "";
    const hasNumericStock =
        stock !== null && stock !== undefined && stock !== "";

    if (hasNumericStock) {
        const numeric = parseInvidNumber(stock);
        return { stock: numeric, stockStatus: status, available: numeric > 0 };
    }

    const available =
        status !== "" && normalizeSearch(status) !== "sin stock";
    return { stock: null, stockStatus: status, available };
}

export function mapInvidArticle(
    raw: InvidRawArticle,
): InvidCatalogItemData | null {
    const invidId = raw.ID !== undefined && raw.ID !== null ? String(raw.ID) : "";
    const title = (raw.TITLE || "").trim();
    if (!invidId || !title) return null;

    const price = parseInvidNumber(raw.PRICE);
    const ivaPercent = parseInvidNumber(raw.IVA_PERCENT);
    const internalTaxPercent = parseInvidNumber(raw.INTERNAL_TAX_PERCENT);
    // Si no viene FINAL_PRICE lo reconstruimos con los porcentajes informados
    const finalPrice =
        parseInvidNumber(raw.FINAL_PRICE) ||
        price * (1 + (ivaPercent + internalTaxPercent) / 100);

    const categories = (raw.CATEGORIES || []).map((cat) => ({
        id: cat.ID !== undefined ? String(cat.ID) : "",
        name: cat.NAME || "",
        isPrimary: Boolean(cat.IS_PRIMARY),
        parentId:
            cat.PARENT?.ID !== undefined ? String(cat.PARENT.ID) : null,
        parentName: cat.PARENT?.NAME || null,
    }));

    const categoryId =
        raw.CATEGORY_ID !== undefined && raw.CATEGORY_ID !== null
            ? String(raw.CATEGORY_ID)
            : "";
    const category = raw.CATEGORY || "";

    // Incluimos las categorías padre para poder filtrar por ellas también
    const categoryIds = new Set<string>();
    const categoryNames = new Set<string>();
    if (categoryId) categoryIds.add(categoryId);
    if (category) categoryNames.add(normalizeSearch(category));
    for (const cat of categories) {
        if (cat.id) categoryIds.add(cat.id);
        if (cat.name) categoryNames.add(normalizeSearch(cat.name));
        if (cat.parentId) categoryIds.add(cat.parentId);
        if (cat.parentName) categoryNames.add(normalizeSearch(cat.parentName));
    }

    const partNumber = (raw.PART_NUMBER || "").trim();
    const ean = (raw.EAN || "").trim();
    const brand = (raw.BRAND || "").trim();

    return {
        invidId,
        title,
        partNumber,
        ean,
        brand,
        price,
        finalPrice: Math.round(finalPrice * 100) / 100,
        ivaPercent,
        internalTaxPercent,
        currency: (raw.CURRENCY || "").trim(),
        ...mapInvidStock(raw.STOCK, raw.STOCK_STATUS),
        imageUrl: raw.IMAGE_URL || null,
        categoryId,
        category,
        categories,
        categoryIds: [...categoryIds],
        categoryNames: [...categoryNames],
        searchText: normalizeSearch(
            [title, brand, partNumber, invidId, ean].join(" "),
        ),
    };
}

export function hasSignificantPriceChange(
    previous: number | null | undefined,
    current: number,
    threshold: number = INVID_PRICE_CHANGE_THRESHOLD,
): boolean {
    if (!previous || previous <= 0) return false;
    return Math.abs(current - previous) / previous >= threshold;
}

export function convertToArs(
    amount: number,
    currency: string,
    usdRate: number,
): number {
    const ars = isUsdCurrency(currency) ? amount * usdRate : amount;
    return Math.round(ars * 100) / 100;
}
