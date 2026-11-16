import type {
    QuoteComponentDTO,
    QuoteDTO,
    QuoteItemDTO,
    QuoteItemOrigin,
} from "@/types/shared/quote";

type IdLike = { toString(): string } | null | undefined;

// Forma del subdocumento en Mongo (models/Quote.ts → QuoteComponentSchema)
interface QuoteComponentDoc {
    _id?: IdLike;
    origin?: QuoteItemOrigin;
    productId?: IdLike;
    distributor?: string | null;
    distributorSku?: string | null;
    name?: string;
    sku?: string;
    image?: string | null;
    quantity?: number;
    costPrice?: number;
    costPriceUsd?: number | null;
    costExchangeRate?: number | null;
    alertAckPriceUsd?: number | null;
    alertAckExchangeRate?: number | null;
    unitPrice?: number;
    taxRate?: number | null;
}

function mapComponentToDTO(c: QuoteComponentDoc): QuoteComponentDTO {
    return {
        id: c._id?.toString(),
        origin: c.origin || "internal",
        productId: c.productId?.toString() || undefined,
        distributor: c.distributor || undefined,
        distributorSku: c.distributorSku || undefined,
        name: c.name || "",
        sku: c.sku || "",
        image: c.image || undefined,
        quantity: Number(c.quantity) || 1,
        costPrice: Number(c.costPrice) || 0,
        costPriceUsd: Number(c.costPriceUsd) || undefined,
        costExchangeRate: Number(c.costExchangeRate) || undefined,
        alertAckPriceUsd: Number(c.alertAckPriceUsd) || undefined,
        alertAckExchangeRate: Number(c.alertAckExchangeRate) || undefined,
        unitPrice: Number(c.unitPrice) || 0,
        taxRate: c.taxRate != null ? Number(c.taxRate) : 10.5,
    };
}

export function mapQuoteToDTO(quote: any): QuoteDTO {
    const isExpired =
        quote.status !== "converted" &&
        quote.status !== "rejected" &&
        quote.status !== "accepted" &&
        new Date(quote.expirationDate).getTime() < Date.now();

    const effectiveStatus = isExpired ? "expired" : quote.status;

    return {
        id: quote._id?.toString() || quote.id,
        number: quote.number || "",
        date: quote.date ? new Date(quote.date).toISOString() : new Date().toISOString(),
        expirationDate: quote.expirationDate
            ? new Date(quote.expirationDate).toISOString()
            : new Date().toISOString(),
        status: effectiveStatus,
        customerId: quote.customerId?.toString() || undefined,
        customer: {
            id: quote.customer?.id?.toString() || undefined,
            name: quote.customer?.name || "Cliente sin nombre",
            email: quote.customer?.email || "",
            phone: quote.customer?.phone || "",
            documentType: quote.customer?.documentType || "DNI",
            documentNumber: quote.customer?.documentNumber || "",
            ivaCondition: quote.customer?.ivaCondition || "Consumidor Final",
            address: quote.customer?.address || {},
        },
        items: (quote.items || []).map((it: any): QuoteItemDTO => ({
            id: it._id?.toString(),
            origin: it.origin || "internal",
            productId: it.productId?.toString() || undefined,
            distributor: it.distributor || undefined,
            distributorSku: it.distributorSku || undefined,
            name: it.name || "",
            sku: it.sku || "",
            image: it.image || undefined,
            quantity: Number(it.quantity) || 1,
            costPrice: Number(it.costPrice) || 0,
            costPriceUsd: Number(it.costPriceUsd) || undefined,
            costExchangeRate: Number(it.costExchangeRate) || undefined,
            alertAckPriceUsd: Number(it.alertAckPriceUsd) || undefined,
            alertAckExchangeRate: Number(it.alertAckExchangeRate) || undefined,
            unitPrice: Number(it.unitPrice) || 0,
            taxRate: Number(it.taxRate) ?? 10.5,
            discount: Number(it.discount) || 0,
            subtotal: Number(it.subtotal) || 0,
            isCustomPc: Boolean(it.isCustomPc),
            components: it.isCustomPc
                ? (it.components || []).map(mapComponentToDTO)
                : [],
        })),
        currency: quote.currency || "ARS",
        exchangeRate: Number(quote.exchangeRate) || 1,
        subtotal: Number(quote.subtotal) || 0,
        ivaTotal: Number(quote.ivaTotal) || 0,
        discountTotal: Number(quote.discountTotal) || 0,
        total: Number(quote.total) || 0,
        notes: quote.notes || "",
        terms: quote.terms || "",
        pdfUrl: quote.pdfUrl || undefined,
        orderId: quote.orderId?.toString() || undefined,
        createdAt: quote.createdAt ? new Date(quote.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: quote.updatedAt ? new Date(quote.updatedAt).toISOString() : new Date().toISOString(),
    };
}
