export type PurchaseDTO = {
    id: string;

    supplierId: string;
    supplierName?: string;

    status: "draft" | "confirmed" | "partially_received" | "received" | "cancelled";

    currency?: "ARS" | "USD";
    exchangeRate?: number;

    items: {
        productId: string | object;
        name: string;
        quantity: number;
        receivedQuantity?: number;
        unitCost: number;
        total: number;
        taxRate: number;
    }[];

    document: {
        date: string;
        type: string;
        number: string;
        fileUrl?: string;
    };

    subtotal: number;
    tax: number;
    total: number;

    notes?: string;

    itemsCount?: number;

    receivedAt?: string | null;
    createdAt: string;
};

export type PurchaseFilters = {
    search?: string;
    status?: string;
    page?: number;
    orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
};

export type GetProductsResponse = {
    purchases: PurchaseDTO[];
    totalPages: number;
    total: number;
};
