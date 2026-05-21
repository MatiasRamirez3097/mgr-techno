export type OrderDTO = {
    id: string;
    customerId: string | null;
    customerEmail: string;
    items: {
        productId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
        image?: string;
        slug?: string;
    }[];
    status:
        | "pending"
        | "processing"
        | "on_hold"
        | "completed"
        | "cancelled"
        | "refunded"
        | "failed";
    billing: {
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
        state: string;
        postcode: string;
        phone: string;
        country: string;
        document: {
            documentType: string;
            number: string;
        };
    };
    shipping: {
        firstName: string;
        lastName: string;
        address1: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    payments: {
        id: string;
        method:
            | "cash"
            | "bank_transfer"
            | "debit_card"
            | "credit_card"
            | "mercadopago"
            | "other";
        status: "pending" | "paid" | "failed" | "refunded";
        amount: number;
        paidAt: string;
    }[];

    paymentStatus: "pending" | "partial" | "paid" | "failed" | "refunded";
    shippingMethod: {
        method: "local_pickup" | "andreani";
        cost: number;
    };
    subtotal: number;
    total: number;
    datePaid: string | null;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    inventoryAllocatedAt: string | null;
    receipt: {
        url: string;
        generatedAt: string;
        receiptPdfPublicId: string;
    };
    invoices?: {
        id: string;

        type: string;

        pointOfSale?: number;

        voucherNumber?: number;

        cae?: string;

        caeExpiration?: string;

        afipStatus: string;

        pdfUrl?: string;

        createdAt: Date;
    }[];
};

export type OrderFilters = {
    search?: string;
    page?: number;
    adminView?: boolean;
    customerId?: string;
};
