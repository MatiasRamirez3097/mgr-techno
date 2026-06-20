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
        | "ready_for_pickup"
        | "shipped"
        | "on_hold"
        | "completed"
        | "cancelled"
        | "refunded"
        | "failed";
    billing: {
        firstName: string;
        lastName: string;
        address: string;
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
        address: string;
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
        method: "local_pickup" | "andreani" | "local_shipping";
        cost: number;
    };
    subtotal: number;
    total: number;
    datePaid: string | null;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    inventoryAllocatedAt: string | null;
    vouchers: {
        id: string;
        type:
            | "non_fiscal_receipt"
            | "fiscal_invoice"
            | "credit_note"
            | "debit_note";
        number: string;
        url: string;
        publicId: string;
    }[];
};

export type OrderFilters = {
    search?: string;
    page?: number;
    adminView?: boolean;
    customerId?: string;
};
