export interface SaleReceiptTemplateData {
    business: {
        name: string;
        address: string;
        phone?: string;
        email?: string;
    };

    customer: {
        name: string;
        email?: string;
        phone?: string;
    };

    order: {
        number: string;
        date: string;
    };

    items: {
        name: string;
        quantity: number;
        price: number;
        total: number;
    }[];

    totals: {
        subtotal: number;
        shipping: number;
        total: number;
    };
}
