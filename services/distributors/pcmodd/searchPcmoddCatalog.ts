import { connectDB } from "@/lib/mongodb";
import { normalizeSearch } from "@/lib/search/normalize";
import { PcmoddCatalogItemModel } from "@/models/PcmoddCatalogItem";
import { convertToArs } from "@/lib/distributors/invidMapper";
import { PCMODD_STOCK_LABEL, pcmoddDisplayName } from "@/lib/distributors/pcmoddMapper";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import type { NormalizedProduct } from "@/types/shared/distributor";

const MAX_RESULTS = 200;

interface CatalogItemLean {
    pcmoddId: string;
    title: string;
    brand: string;
    finalPrice: number;
    ivaPercent: number;
    currency: string;
}

/**
 * Busca en la copia local de la hoja de PCMODD. `brands` son las marcas mapeadas a la categoría
 * del comparador (la hoja no tiene categorías).
 */
export async function searchPcmoddCatalog(searchQuery: string, brands: string[] = []): Promise<NormalizedProduct[]> {
    await connectDB();

    const usd = await getUsdExchangeRate();
    if (!usd) {
        console.error("PCMODD: sin cotización del dólar, no se pueden mostrar precios");
        return [];
    }

    const filter: Record<string, unknown> = { available: true };
    const and: Record<string, unknown>[] = [];
    // normalizeSearch sólo deja letras, números y espacios: no hace falta escapar
    for (const token of normalizeSearch(searchQuery).split(/\s+/).filter(Boolean)) {
        and.push({ searchText: { $regex: token } });
    }
    if (brands.length > 0) and.push({ brand: { $in: brands } });
    if (and.length > 0) filter.$and = and;

    const items = await PcmoddCatalogItemModel.find(filter)
        .sort({ finalPrice: 1 })
        .limit(MAX_RESULTS)
        .lean<CatalogItemLean[]>();

    return items.map((item) => ({
        id: item.pcmoddId,
        distributor: "PCMODD",
        // Sin códigos en la hoja: el SKU es el propio ID (marca + nombre)
        sku: item.pcmoddId,
        name: pcmoddDisplayName(item.title, item.brand),
        price: convertToArs(item.finalPrice, item.currency, usd.rate),
        stock: 0,
        stockLabel: PCMODD_STOCK_LABEL,
        image: null,
        link: null,
        originalCategory: item.brand,
        originalPrice: item.finalPrice,
        originalCurrency: item.currency,
        exchangeRate: usd.rate,
        taxRate: item.ivaPercent || undefined,
    }));
}
