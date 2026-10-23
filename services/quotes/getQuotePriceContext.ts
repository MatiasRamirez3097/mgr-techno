import { connectDB } from "@/lib/mongodb";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import { isQuoteOpen, quotePriceKey, type QuotePriceContext } from "@/lib/quotes/priceAlerts";
import type { QuoteDTO } from "@/types/shared/quote";

/**
 * Precios actuales en USD (catálogos locales de Invid y AIR) y cotización vigente para
 * calcular las alertas de precio de los presupuestos abiertos con ítems en dólares.
 */
export async function getQuotePriceContext(quotes: QuoteDTO[]): Promise<QuotePriceContext> {
    const idsByDistributor: Record<string, Set<string>> = { invid: new Set(), air: new Set() };
    for (const quote of quotes) {
        if (!isQuoteOpen(quote)) continue;
        for (const item of quote.items) {
            const ids = item.distributor ? idsByDistributor[item.distributor] : undefined;
            if (ids && item.distributorSku && item.costPriceUsd) {
                ids.add(item.distributorSku);
            }
        }
    }

    const invidIds = [...idsByDistributor.invid];
    const airIds = [...idsByDistributor.air];
    if (invidIds.length === 0 && airIds.length === 0) return { prices: {}, usdRate: null };

    await connectDB();

    const [invidItems, airItems, usd] = await Promise.all([
        invidIds.length > 0
            ? InvidCatalogItemModel.find(
                  { invidId: { $in: invidIds }, available: true },
                  { invidId: 1, finalPrice: 1 },
              ).lean<{ invidId: string; finalPrice: number }[]>()
            : [],
        airIds.length > 0
            ? AirCatalogItemModel.find(
                  { airId: { $in: airIds }, available: true },
                  { airId: 1, finalPrice: 1 },
              ).lean<{ airId: string; finalPrice: number }[]>()
            : [],
        getUsdExchangeRate(),
    ]);

    return {
        prices: Object.fromEntries([
            ...invidItems.map((i) => [quotePriceKey("invid", i.invidId), i.finalPrice]),
            ...airItems.map((i) => [quotePriceKey("air", i.airId), i.finalPrice]),
        ]),
        usdRate: usd?.rate ?? null,
    };
}
