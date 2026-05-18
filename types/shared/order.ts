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
        method: string;
        status: string;
        amount: number;
        paidAt: string;
    }[];

    paymentStatus: "pending" | "partial" | "paid" | "failed" | "refunded";
    shippingMethod: {
        method: "local_pickup" | "andreani";
        title: String;
        cost: number;
    };
    subtotal: number;
    total: number;
    datePaid: string | null;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    inventoryAllocatedAt: string | null;
};

export type OrderFilters = {
    search?: string;
    page?: number;
    adminView?: boolean;
    customerId?: string;
};
