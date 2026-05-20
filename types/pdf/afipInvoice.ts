export interface AfipInvoiceTemplateData {
    business: {
        name: string;
        cuit: string;
        address: string;
        ivaCondition: string;
    };

    customer: {
        name: string;
        document: string;
        ivaCondition: string;
        address?: string;
    };

    invoice: {
        letter: string;
        pointOfSale: string;
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
        iva: number;
        total: number;
    };

    afip: {
        cae: string;
        caeExpiration: string;
        qrImage: string;
    };
}
