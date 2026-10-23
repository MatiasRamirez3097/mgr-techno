import { connectDB } from "@/lib/mongodb";
import { normalizeSearch } from "@/lib/search/normalize";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import {
    buildCategoryNamePattern,
    buildInvidProductUrl,
    convertToArs,
    isInvidCategoryId,
} from "@/lib/distributors/invidMapper";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import type { NormalizedProduct } from "@/types/shared/distributor";

const MAX_RESULTS = 200;

interface CatalogItemLean {
    invidId: string;
    title: string;
    partNumber: string;
    finalPrice: number;
    ivaPercent: number;
    currency: string;
    stock: number | null;
    stockStatus: string;
    imageUrl: string | null;
    category: string;
}

/**
 * Busca en la copia local del catálogo de Invid. `categories` acepta IDs numéricos
 * o nombres de categoría (comparados sin plurales ni mayúsculas, ver buildCategoryNamePattern).
 */
export async function searchInvidCatalog(
    searchQuery: string,
    categories: string[] = [],
): Promise<NormalizedProduct[]> {
    await connectDB();

    const usd = await getUsdExchangeRate();
    if (!usd) {
        console.error("Invid: sin cotización del dólar, no se pueden mostrar precios");
        return [];
    }

    const filter: Record<string, unknown> = { available: true };
    const and: Record<string, unknown>[] = [];

    const tokens = normalizeSearch(searchQuery).split(/\s+/).filter(Boolean);
    for (const token of tokens) {
        // normalizeSearch sólo deja letras, números y espacios: no hace falta escapar
        and.push({ searchText: { $regex: token } });
    }

    if (categories.length > 0) {
        const ids = categories.filter(isInvidCategoryId);
        const namePatterns = categories
            .filter((c) => !isInvidCategoryId(c))
            .map(buildCategoryNamePattern)
            .filter((p): p is string => p !== null);

        const or: Record<string, unknown>[] = [];
        if (ids.length > 0) or.push({ categoryIds: { $in: ids } });
        for (const pattern of namePatterns) {
            or.push({ categoryNames: { $regex: pattern } });
        }
        // Una categoría sin nada comparable no debe devolver todo el catálogo
        if (or.length === 0) return [];
        and.push({ $or: or });
    }

    if (and.length > 0) filter.$and = and;

    const items = await InvidCatalogItemModel.find(filter)
        .sort({ finalPrice: 1 })
        .limit(MAX_RESULTS)
        .lean<CatalogItemLean[]>();

    return items.map((item) => ({
        id: item.invidId,
        distributor: "INVID",
        sku: item.partNumber || item.invidId,
        name: item.title,
        price: convertToArs(item.finalPrice, item.currency, usd.rate),
        stock: item.stock ?? 0,
        ...(item.stock === null && item.stockStatus
            ? { stockLabel: item.stockStatus }
            : {}),
        image: item.imageUrl,
        link: buildInvidProductUrl(item.title, item.invidId),
        originalCategory: item.category,
        originalPrice: item.finalPrice,
        originalCurrency: item.currency,
        exchangeRate: usd.rate,
        taxRate: item.ivaPercent || undefined,
    }));
}
