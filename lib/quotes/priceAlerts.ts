import { hasSignificantPriceChange, INVID_PRICE_CHANGE_THRESHOLD } from "@/lib/distributors/invidMapper";
import type { QuoteDTO, QuoteItemDTO } from "@/types/shared/quote";

// Suba del dólar respecto de la cotización del ítem a partir de la cual se avisa
export const QUOTE_EXCHANGE_RATE_RISE_THRESHOLD = 0.1;
export const QUOTE_COST_CHANGE_THRESHOLD = INVID_PRICE_CHANGE_THRESHOLD;

export interface QuoteItemPriceAlert {
    type: "cost" | "exchange_rate";
    previous: number;
    current: number;
    // Variación relativa (0.05 = +5%)
    change: number;
}

// Distribuidores en dólares con catálogo local, cuyos ítems pueden tener alertas
export const USD_CATALOG_DISTRIBUTORS = ["invid", "air"] as const;

// Clave de `prices`: distribuidor y su código (distributorSku), ej: "air:39580"
export const quotePriceKey = (distributor: string, sku: string) =>
    `${distributor.toLowerCase()}:${sku}`;

// Precio actual en USD por distribuidor y código, y cotización vigente
export interface QuotePriceContext {
    prices: Record<string, number>;
    usdRate: number | null;
}

const currentPriceFor = (item: QuoteItemDTO, context: QuotePriceContext) =>
    item.distributor && item.distributorSku
        ? context.prices[quotePriceKey(item.distributor, item.distributorSku)]
        : undefined;

const OPEN_STATUSES = new Set(["draft", "sent", "accepted"]);

// mapQuoteToDTO ya devuelve "expired" para los presupuestos vencidos
export const isQuoteOpen = (quote: Pick<QuoteDTO, "status">) => OPEN_STATUSES.has(quote.status);

const isDollarItem = (item: QuoteItemDTO) =>
    item.origin === "distributor" && Boolean(item.costPriceUsd) && Boolean(item.distributorSku);

const rateRose = (previous: number, current: number) =>
    current >= previous * (1 + QUOTE_EXCHANGE_RATE_RISE_THRESHOLD);

/**
 * Alertas de un ítem en dólares: el costo del distribuidor varió 2% o más, o el dólar
 * subió 10% o más respecto de la cotización con la que se cargó. Si el admin ignoró una
 * alerta, sólo vuelve a avisar si el valor cambió otra vez por encima del umbral.
 */
export function getQuoteItemPriceAlerts(
    item: QuoteItemDTO,
    context: QuotePriceContext,
): QuoteItemPriceAlert[] {
    if (!isDollarItem(item)) return [];

    const alerts: QuoteItemPriceAlert[] = [];
    const previousCost = item.costPriceUsd!;
    const currentCost = currentPriceFor(item, context);

    if (
        currentCost &&
        currentCost > 0 &&
        hasSignificantPriceChange(previousCost, currentCost, QUOTE_COST_CHANGE_THRESHOLD) &&
        !(
            item.alertAckPriceUsd &&
            !hasSignificantPriceChange(item.alertAckPriceUsd, currentCost, QUOTE_COST_CHANGE_THRESHOLD)
        )
    ) {
        alerts.push({
            type: "cost",
            previous: previousCost,
            current: currentCost,
            change: (currentCost - previousCost) / previousCost,
        });
    }

    const previousRate = item.costExchangeRate;
    const currentRate = context.usdRate;
    if (
        previousRate &&
        currentRate &&
        rateRose(previousRate, currentRate) &&
        !(item.alertAckExchangeRate && !rateRose(item.alertAckExchangeRate, currentRate))
    ) {
        alerts.push({
            type: "exchange_rate",
            previous: previousRate,
            current: currentRate,
            change: (currentRate - previousRate) / previousRate,
        });
    }

    return alerts;
}

export function countQuotePriceAlerts(quote: QuoteDTO, context: QuotePriceContext): number {
    if (!isQuoteOpen(quote)) return 0;
    return quote.items.filter((item) => getQuoteItemPriceAlerts(item, context).length > 0).length;
}

/**
 * Actualiza el costo del ítem al vigente y mantiene el margen sobre el precio de venta.
 */
export function refreshQuoteItemCost(item: QuoteItemDTO, context: QuotePriceContext): QuoteItemDTO {
    const priceUsd = currentPriceFor(item, context) || item.costPriceUsd || 0;
    const rate = context.usdRate || item.costExchangeRate || 0;
    const newCost = Math.round(priceUsd * rate * 100) / 100;

    const oldCost = Number(item.costPrice) || 0;
    const unitPrice =
        oldCost > 0 ? Math.round((newCost * (Number(item.unitPrice) || 0)) / oldCost) : item.unitPrice;

    const quantity = Math.max(1, Number(item.quantity) || 1);
    const discount = Math.max(0, Number(item.discount) || 0);

    return {
        ...item,
        costPriceUsd: priceUsd,
        costExchangeRate: rate,
        costPrice: newCost,
        unitPrice,
        alertAckPriceUsd: undefined,
        alertAckExchangeRate: undefined,
        subtotal: Math.max(0, unitPrice * quantity - discount),
    };
}

// Ignora las alertas actuales del ítem: se registran los valores vigentes
export function acknowledgeQuoteItemAlerts(
    item: QuoteItemDTO,
    context: QuotePriceContext,
): QuoteItemDTO {
    return {
        ...item,
        alertAckPriceUsd: currentPriceFor(item, context) || item.alertAckPriceUsd,
        alertAckExchangeRate: context.usdRate || item.alertAckExchangeRate,
    };
}
