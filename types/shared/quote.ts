export type QuoteStatus =
    | "draft"
    | "sent"
    | "accepted"
    | "expired"
    | "rejected"
    | "converted";

export type QuoteItemOrigin = "internal" | "distributor" | "manual";

export interface QuoteItemDTO {
    id?: string;
    origin: QuoteItemOrigin;
    productId?: string;
    distributor?: "elit" | "newbytes" | string;
    distributorSku?: string;
    name: string;
    sku?: string;
    quantity: number;
    costPrice?: number;
    unitPrice: number;
    taxRate: number; // e.g. 10.5 or 21
    discount?: number;
    subtotal: number;
}

export interface QuoteCustomerSnapshot {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    documentType?: string; // DNI, CUIT, etc.
    documentNumber?: string;
    ivaCondition?: string; // Consumidor Final, Responsable Inscripto, etc.
    address?: {
        street?: string;
        number?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
}

export interface QuoteDTO {
    id: string;
    number: string; // e.g. PRE-0001-00000001
    date: string;
    expirationDate: string;
    status: QuoteStatus;
    customerId?: string;
    customer: QuoteCustomerSnapshot;
    items: QuoteItemDTO[];
    currency: "ARS" | "USD";
    exchangeRate?: number;
    subtotal: number;
    ivaTotal: number;
    discountTotal: number;
    total: number;
    notes?: string;
    terms?: string;
    pdfUrl?: string;
    orderId?: string; // If converted to order
    createdAt: string;
    updatedAt: string;
}

export interface CreateQuoteDTO {
    customerId?: string;
    customer: QuoteCustomerSnapshot;
    date?: string;
    expirationDate: string;
    status?: QuoteStatus;
    items: Omit<QuoteItemDTO, "subtotal">[];
    currency?: "ARS" | "USD";
    exchangeRate?: number;
    notes?: string;
    terms?: string;
}

export interface UpdateQuoteDTO extends Partial<CreateQuoteDTO> {
    status?: QuoteStatus;
}
