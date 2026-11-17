import { connectDB } from "@/lib/mongodb";
import { InvidCatalogItemModel } from "@/models/InvidCatalogItem";
import { AirCatalogItemModel } from "@/models/AirCatalogItem";
import { PcmoddCatalogItemModel } from "@/models/PcmoddCatalogItem";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";
import { isQuoteOpen, quotePriceKey, type QuotePriceContext } from "@/lib/quotes/priceAlerts";
import type { QuoteDTO } from "@/types/shared/quote";

/**
 * Precios actuales en USD (catálogos locales de Invid, AIR y PCMODD) y cotización vigente para
 * calcular las alertas de precio de los presupuestos abiertos con ítems en dólares.
 */
export async function getQuotePriceContext(quotes: QuoteDTO[]): Promise<QuotePriceContext> {
    const idsByDistributor: Record<string, Set<string>> = { invid: new Set(), air: new Set(), pcmodd: new Set() };
    for (const quote of quotes) {
        if (!isQuoteOpen(quote)) continue;
        // Los componentes de las PC Armadas también pueden ser de distribuidores en dólares
        const lines = quote.items.flatMap((item) =>
            item.isCustomPc ? (item.components ?? []) : [item],
        );
        for (const item of lines) {
            const ids = item.distributor ? idsByDistributor[item.distributor] : undefined;
            if (ids && item.distributorSku && item.costPriceUsd) {
                ids.add(item.distributorSku);
            }
        }
    }

    const invidIds = [...idsByDistributor.invid];
    const airIds = [...idsByDistributor.air];
    const pcmoddIds = [...idsByDistributor.pcmodd];
    if (invidIds.length === 0 && airIds.length === 0 && pcmoddIds.length === 0) {
        return { prices: {}, usdRate: null };
    }

    await connectDB();

    const [invidItems, airItems, pcmoddItems, usd] = await Promise.all([
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
        pcmoddIds.length > 0
            ? PcmoddCatalogItemModel.find(
                  { pcmoddId: { $in: pcmoddIds }, available: true },
                  { pcmoddId: 1, finalPrice: 1 },
              ).lean<{ pcmoddId: string; finalPrice: number }[]>()
            : [],
        getUsdExchangeRate(),
    ]);

    return {
        prices: Object.fromEntries([
            ...invidItems.map((i) => [quotePriceKey("invid", i.invidId), i.finalPrice]),
            ...airItems.map((i) => [quotePriceKey("air", i.airId), i.finalPrice]),
            ...pcmoddItems.map((i) => [quotePriceKey("pcmodd", i.pcmoddId), i.finalPrice]),
        ]),
        usdRate: usd?.rate ?? null,
    };
}
