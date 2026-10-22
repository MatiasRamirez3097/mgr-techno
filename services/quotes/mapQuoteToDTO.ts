import type { QuoteDTO, QuoteItemDTO } from "@/types/shared/quote";

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
            unitPrice: Number(it.unitPrice) || 0,
            taxRate: Number(it.taxRate) ?? 10.5,
            discount: Number(it.discount) || 0,
            subtotal: Number(it.subtotal) || 0,
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
