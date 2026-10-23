import { connectDB } from "@/lib/mongodb";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import { isQuoteOpen, type QuotePriceContext } from "@/lib/quotes/priceAlerts";
import type { QuoteDTO } from "@/types/shared/quote";

/**
 * Precios actuales de Invid (USD) y cotización vigente para calcular las alertas
 * de precio de los presupuestos abiertos con ítems en dólares.
 */
export async function getQuotePriceContext(quotes: QuoteDTO[]): Promise<QuotePriceContext> {
    const invidIds = new Set<string>();
    for (const quote of quotes) {
        if (!isQuoteOpen(quote)) continue;
        for (const item of quote.items) {
            if (item.distributor === "invid" && item.distributorSku && item.costPriceUsd) {
                invidIds.add(item.distributorSku);
            }
        }
    }

    if (invidIds.size === 0) return { invidPrices: {}, usdRate: null };

    await connectDB();

    const [items, usd] = await Promise.all([
        InvidCatalogItemModel.find(
            { invidId: { $in: [...invidIds] }, available: true },
            { invidId: 1, finalPrice: 1 },
        ).lean<{ invidId: string; finalPrice: number }[]>(),
        getUsdExchangeRate(),
    ]);

    return {
        invidPrices: Object.fromEntries(items.map((i) => [i.invidId, i.finalPrice])),
        usdRate: usd?.rate ?? null,
    };
}
