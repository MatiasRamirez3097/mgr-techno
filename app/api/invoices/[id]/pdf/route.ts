import { NextResponse } from "next/server";

import { afipInvoiceTemplate } from "@/lib/pdf/templates/afipInvoiceTemplate";
import { generateInvoicePdf } from "@/lib/pdf/generators/generateInvoicePdf";

export async function GET() {
    const html = afipInvoiceTemplate({
        business: {
            name: "MGR Tech",
            cuit: "20-12345678-9",
            address: "Rosario",
            ivaCondition: "Responsable Inscripto",
        },

        customer: {
            name: "Juan Perez",
            document: "30111222",
            ivaCondition: "Consumidor Final",
        },

        invoice: {
            letter: "B",
            pointOfSale: "0005",
            number: "00001234",
            date: "20/05/2026",
        },

        items: [
            {
                name: "Mouse Gamer",
                quantity: 1,
                price: 100000,
                total: 100000,
            },
        ],

        totals: {
            subtotal: 82644.63,
            iva: 17355.37,
            total: 100000,
        },

        afip: {
            cae: "123456789",
            caeExpiration: "30/05/2026",
            qrImage: "https://...",
        },
    });

    const pdf = await generateInvoicePdf(html);

    return new NextResponse(pdf, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="factura.pdf"',
        },
    });
}
