export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";

import { OrderModel } from "@/models/Order";

import { mapOrderToDocument } from "@/lib/pdf/mappers/mapOrderToDocument";

import { generatePdf } from "@/lib/pdf/generators/generatePdf";

export async function GET(
    _req: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    },
) {
    try {
        await connectDB();

        const { id } = await context.params;

        /*
        |------------------------------------------------------------------
        | ORDER
        |------------------------------------------------------------------
        */

        const order = await OrderModel.findById(id).populate("invoices").lean();

        if (!order) {
            return Response.json(
                {
                    success: false,

                    error: "Order not found",
                },
                {
                    status: 404,
                },
            );
        }

        /*
        |------------------------------------------------------------------
        | INVOICE
        |------------------------------------------------------------------
        */

        const invoice = order.invoices?.find(
            (invoice: any) => invoice.afipStatus === "authorized",
        );

        /*
        |------------------------------------------------------------------
        | MAP DOCUMENT DATA
        |------------------------------------------------------------------
        */

        const data = mapOrderToDocument({
            order,

            invoice,
        });

        /*
        |------------------------------------------------------------------
        | GENERATE PDF
        |------------------------------------------------------------------
        */

        const pdf = await generatePdf(data);

        /*
        |------------------------------------------------------------------
        | RESPONSE
        |------------------------------------------------------------------
        */

        return new Response(pdf, {
            status: 200,

            headers: {
                "Content-Type": "application/pdf",

                "Content-Disposition": `inline; filename="${
                    invoice ? "factura" : "comprobante"
                }-${data.document.number}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,

                error: error.message || "Internal server error",
            },
            {
                status: 500,
            },
        );
    }
}
