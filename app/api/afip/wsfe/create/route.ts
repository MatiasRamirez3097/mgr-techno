// /app/api/afip/wsfe/create/route.ts

import { connectDB } from "@/lib/mongodb";

import { OrderModel } from "@/models/Order";

import { InvoiceModel } from "@/models/Invoice";

import { createVoucher } from "@/lib/afip/wsfe/createVoucher";

import {
    AFIP_DOCUMENT_TYPES,
    AFIP_INVOICE_TYPES,
    AFIP_TAX_CONDITIONS,
} from "@/lib/afip/constants";

export async function POST(req: Request) {
    try {
        await connectDB();

        const { orderId } = await req.json();

        const order = await OrderModel.findById(orderId).lean();

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

        // =====================================
        // SNAPSHOTS
        // =====================================

        const customerSnapshot = {
            name: order.customer?.name ?? "",

            documentType:
                order.customer?.documentType ?? AFIP_DOCUMENT_TYPES.DNI,

            documentNumber: order.customer?.documentNumber ?? "",

            taxCondition: order.customer?.taxCondition ?? {
                id: AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL,

                label: "Consumidor Final",
            },

            address: order.customer?.address ?? "",
        };

        const itemsSnapshot = order.items.map((item: any) => ({
            productId: item.productId,

            title: item.title,

            quantity: item.quantity,

            unitPrice: item.unitPrice,

            subtotal: Number((item.quantity * item.unitPrice).toFixed(2)),
        }));

        const subtotal = itemsSnapshot.reduce(
            (acc: number, item: any) => acc + item.subtotal,
            0,
        );

        const iva = Number((subtotal * 0.21).toFixed(2));

        const total = Number((subtotal + iva).toFixed(2));

        const totalsSnapshot = {
            subtotal,

            iva,

            total,
        };

        // =====================================
        // CREAR INVOICE PENDING
        // =====================================

        const invoice = await InvoiceModel.create({
            orderId,

            customerSnapshot,

            itemsSnapshot,

            totalsSnapshot,

            type: "FB",

            pointOfSale: 5,

            voucherType: AFIP_INVOICE_TYPES.FACTURA_B,

            afipStatus: "pending",
        });

        // =====================================
        // EMITIR AFIP
        // =====================================

        const afipResponse = await createVoucher({
            pointOfSale: 6,

            voucherType: AFIP_INVOICE_TYPES.FACTURA_B,

            customer: customerSnapshot,

            items: itemsSnapshot,
        });

        // =====================================
        // GUARDAR RESULTADO
        // =====================================

        invoice.voucherNumber = afipResponse.voucherNumber;

        invoice.cae = afipResponse.cae;

        invoice.caeExpiration = afipResponse.caeExpiration;

        invoice.afipStatus = "authorized";

        invoice.afipResult = afipResponse.result;

        invoice.afipRequestXml = afipResponse.requestXml;

        invoice.afipResponseXml = afipResponse.responseXml;

        await invoice.save();

        // =====================================
        // RELACIONAR ORDER
        // =====================================

        await OrderModel.findByIdAndUpdate(orderId, {
            $push: {
                invoices: invoice._id,
            },
        });

        return Response.json({
            success: true,

            invoice,
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,

                error: error.message,
            },
            {
                status: 500,
            },
        );
    }
}
