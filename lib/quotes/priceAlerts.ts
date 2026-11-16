import { hasSignificantPriceChange, INVID_PRICE_CHANGE_THRESHOLD } from "@/lib/distributors/invidMapper";
import type { QuoteComponentDTO, QuoteDTO, QuoteItemDTO } from "@/types/shared/quote";

// Campos de costo comunes a un ítem y a un componente de PC Armada
export type QuoteCostLine = Pick<
    QuoteItemDTO,
    | "origin"
    | "distributor"
    | "distributorSku"
    | "costPrice"
    | "costPriceUsd"
    | "costExchangeRate"
    | "alertAckPriceUsd"
    | "alertAckExchangeRate"
    | "unitPrice"
>;

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

const currentPriceFor = (item: QuoteCostLine, context: QuotePriceContext) =>
    item.distributor && item.distributorSku
        ? context.prices[quotePriceKey(item.distributor, item.distributorSku)]
        : undefined;

const OPEN_STATUSES = new Set(["draft", "sent", "accepted"]);

// mapQuoteToDTO ya devuelve "expired" para los presupuestos vencidos
export const isQuoteOpen = (quote: Pick<QuoteDTO, "status">) => OPEN_STATUSES.has(quote.status);

const isDollarItem = (item: QuoteCostLine) =>
    item.origin === "distributor" && Boolean(item.costPriceUsd) && Boolean(item.distributorSku);

const rateRose = (previous: number, current: number) =>
    current >= previous * (1 + QUOTE_EXCHANGE_RATE_RISE_THRESHOLD);

/**
 * Alertas de un ítem en dólares: el costo del distribuidor varió 2% o más, o el dólar
 * subió 10% o más respecto de la cotización con la que se cargó. Si el admin ignoró una
 * alerta, sólo vuelve a avisar si el valor cambió otra vez por encima del umbral.
 */
export function getQuoteItemPriceAlerts(
    item: QuoteCostLine,
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

/** Alertas de cada componente de una PC Armada, en el mismo orden que `components`. */
export function getCustomPcComponentAlerts(
    item: QuoteItemDTO,
    context: QuotePriceContext,
): QuoteItemPriceAlert[][] {
    if (!item.isCustomPc) return [];
    return (item.components || []).map((c) => getQuoteItemPriceAlerts(c, context));
}

// Un ítem tiene alertas si las tiene él o alguno de sus componentes (PC Armada)
export function quoteItemHasPriceAlerts(item: QuoteItemDTO, context: QuotePriceContext): boolean {
    return item.isCustomPc
        ? getCustomPcComponentAlerts(item, context).some((alerts) => alerts.length > 0)
        : getQuoteItemPriceAlerts(item, context).length > 0;
}

export function countQuotePriceAlerts(quote: QuoteDTO, context: QuotePriceContext): number {
    if (!isQuoteOpen(quote)) return 0;
    return quote.items.filter((item) => quoteItemHasPriceAlerts(item, context)).length;
}

/**
 * Actualiza el costo de la línea al vigente y mantiene el margen sobre el precio de venta.
 */
function refreshLineCost<T extends QuoteCostLine>(line: T, context: QuotePriceContext): T {
    const priceUsd = currentPriceFor(line, context) || line.costPriceUsd || 0;
    const rate = context.usdRate || line.costExchangeRate || 0;
    const newCost = Math.round(priceUsd * rate * 100) / 100;

    const oldCost = Number(line.costPrice) || 0;
    const unitPrice =
        oldCost > 0 ? Math.round((newCost * (Number(line.unitPrice) || 0)) / oldCost) : line.unitPrice;

    return {
        ...line,
        costPriceUsd: priceUsd,
        costExchangeRate: rate,
        costPrice: newCost,
        unitPrice,
        alertAckPriceUsd: undefined,
        alertAckExchangeRate: undefined,
    };
}

// Ignora las alertas actuales de la línea: se registran los valores vigentes
function acknowledgeLineAlerts<T extends QuoteCostLine>(line: T, context: QuotePriceContext): T {
    return {
        ...line,
        alertAckPriceUsd: currentPriceFor(line, context) || line.alertAckPriceUsd,
        alertAckExchangeRate: context.usdRate || line.alertAckExchangeRate,
    };
}

export function refreshQuoteItemCost(item: QuoteItemDTO, context: QuotePriceContext): QuoteItemDTO {
    const updated = refreshLineCost(item, context);
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const discount = Math.max(0, Number(item.discount) || 0);
    return { ...updated, subtotal: Math.max(0, updated.unitPrice * quantity - discount) };
}

export function acknowledgeQuoteItemAlerts(
    item: QuoteItemDTO,
    context: QuotePriceContext,
): QuoteItemDTO {
    return acknowledgeLineAlerts(item, context);
}

/**
 * Actualiza o ignora las alertas de un componente de PC Armada. El precio de la PC no se
 * recalcula solo: se carga a mano (con la opción de usar la suma de los componentes).
 */
export function resolveCustomPcComponentAlert(
    item: QuoteItemDTO,
    componentIndex: number,
    action: "refresh" | "ignore",
    context: QuotePriceContext,
): QuoteItemDTO {
    const components = [...(item.components || [])];
    const component = components[componentIndex];
    if (!component) return item;
    components[componentIndex] =
        action === "refresh"
            ? refreshLineCost<QuoteComponentDTO>(component, context)
            : acknowledgeLineAlerts<QuoteComponentDTO>(component, context);
    return { ...item, components };
}
