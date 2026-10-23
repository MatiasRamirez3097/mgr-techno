import { connectDB } from "@/lib/mongodb";
import { normalizeSearch } from "@/lib/search/normalize";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import { convertToArs } from "@/lib/distributors/invidMapper";
import { getAirStockLabel, type AirWarehouse } from "@/lib/distributors/airMapper";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import type { NormalizedProduct } from "@/types/shared/distributor";

const MAX_RESULTS = 200;

interface CatalogItemLean {
    airId: string;
    title: string;
    partNumber: string;
    brand: string;
    finalPrice: number;
    ivaPercent: number;
    currency: string;
    stock: number;
    stockByWarehouse?: Partial<Record<AirWarehouse, number>>;
    category: string;
}

/**
 * Busca en la copia local de la lista de AIR. `categories` son códigos de rubro (ej: "001-0331").
 */
export async function searchAirCatalog(
    searchQuery: string,
    categories: string[] = [],
): Promise<NormalizedProduct[]> {
    await connectDB();

    const usd = await getUsdExchangeRate();
    if (!usd) {
        console.error("AIR: sin cotización del dólar, no se pueden mostrar precios");
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
        and.push({ categoryId: { $in: categories } });
    }
    if (and.length > 0) filter.$and = and;

    const items = await AirCatalogItemModel.find(filter)
        .sort({ finalPrice: 1 })
        .limit(MAX_RESULTS)
        .lean<CatalogItemLean[]>();

    return items.map((item) => {
        const stockLabel = getAirStockLabel(item.stockByWarehouse);
        return {
            id: item.airId,
            distributor: "AIR",
            sku: item.partNumber || item.airId,
            name: item.brand && !item.title.toLowerCase().includes(item.brand.toLowerCase())
                ? `${item.title} (${item.brand})`
                : item.title,
            price: convertToArs(item.finalPrice, item.currency, usd.rate),
            stock: item.stock,
            ...(stockLabel ? { stockLabel } : {}),
            image: null,
            link: null,
            originalCategory: item.category,
            originalPrice: item.finalPrice,
            originalCurrency: item.currency,
            exchangeRate: usd.rate,
            taxRate: item.ivaPercent || undefined,
        };
    });
}
