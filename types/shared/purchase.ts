export type PurchaseDTO = {
    id: string;

    supplierId: string;
    supplierName?: string;

    status: "draft" | "confirmed" | "received" | "cancelled";

    items: {
        productId: string;
        quantity: number;
        cost: number;
        total: number;
    }[];

    document?: {
        type?: string;
        number?: string;
        fileUrl?: string;
    };

    subtotal: number;
    tax: number;
    total: number;

    notes?: string;

    receivedAt?: string | null;
    createdAt: string;
};

export type PurchaseFilters = {
    search?: string;
    page?: number;
    orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
};

export type GetProductsResponse = {
    purchases: PurchaseDTO[];
    totalPages: number;
    total: number;
};
