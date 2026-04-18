export type OrderDTO = {
    id: string;
    customerId: string | null;
    customerEmail: string;
    lineItems: {
        productId: string;
        name: string;
        quantity: number;
        price: number;
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
        tipoDocumento: string;
        numeroDocumento: string;
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
    paymentMethod: "mercadopago" | "bacs" | "cod";
    paymentMethodTitle: string;
    shippingMethod: "local_pickup" | "andreani";
    shippingCost: number;
    subtotal: number;
    total: number;
    datePaid: string | null;
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

export type OrderFilters = {
    search?: string;
    page?: number;
    adminView?: boolean;
};
