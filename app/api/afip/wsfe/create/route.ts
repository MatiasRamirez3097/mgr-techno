export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";

import { OrderModel } from "@/models/Order";
import { InvoiceModel } from "@/models/Invoice";

import { getAuth } from "@/lib/afip/auth/getAuth";

import { createVoucher } from "@/lib/afip/wsfe/createVoucher";

import { getLastVoucher } from "@/lib/afip/wsfe/getLastVoucher";

import { buildInvoiceRequest } from "@/lib/afip/wsfe/buildInvoiceRequest";

import {
    AFIP_DOCUMENT_TYPES,
    AFIP_INVOICE_TYPES,
    AFIP_TAX_CONDITIONS,
} from "@/lib/afip/constants";

const POINT_OF_SALE = 5;

export async function POST(req: Request) {
    try {
        await connectDB();

        const { orderId } = await req.json();

        /*
        |--------------------------------------------------------------------------
        | ORDER
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | SNAPSHOTS
        |--------------------------------------------------------------------------
        */

        const customerSnapshot = {
            name:
                order.customer?.name ??
                `${order.billing?.firstName || ""} ${order.billing?.lastName || ""}`,

            documentType:
                order.customer?.documentType ?? AFIP_DOCUMENT_TYPES.DNI,

            documentNumber:
                order.customer?.documentNumber ??
                order.billing?.document?.number ??
                "",

            taxCondition: order.customer?.taxCondition ?? {
                id: AFIP_TAX_CONDITIONS.CONSUMIDOR_FINAL,

                label: "Consumidor Final",
            },

            address: order.customer?.address ?? order.billing?.address1 ?? "",
        };

        const itemsSnapshot = order.items.map((item: any) => ({
            productId: item.productId,

            title: item.title ?? item.name,

            quantity: item.quantity,

            unitPrice: item.unitPrice ?? item.price,

            subtotal: Number(
                (item.quantity * (item.unitPrice ?? item.price)).toFixed(2),
            ),
        }));

        const subtotal = Number(
            itemsSnapshot
                .reduce((acc: number, item: any) => acc + item.subtotal, 0)
                .toFixed(2),
        );

        const iva = Number((subtotal * 0.21).toFixed(2));

        const total = Number((subtotal + iva).toFixed(2));

        const totalsSnapshot = {
            subtotal,
            iva,
            total,
        };

        /*
        |--------------------------------------------------------------------------
        | CREATE INVOICE PENDING
        |--------------------------------------------------------------------------
        */

        const invoice = await InvoiceModel.create({
            orderId,

            customerSnapshot,

            itemsSnapshot,

            totalsSnapshot,

            type: "FB",

            pointOfSale: POINT_OF_SALE,

            voucherType: AFIP_INVOICE_TYPES.FACTURA_B,

            afipStatus: "pending",
        });

        /*
        |--------------------------------------------------------------------------
        | AFIP AUTH
        |--------------------------------------------------------------------------
        */

        const auth = await getAuth();

        /*
        |--------------------------------------------------------------------------
        | GET NEXT VOUCHER NUMBER
        |--------------------------------------------------------------------------
        */

        const lastVoucher = await getLastVoucher({
            token: auth.token,

            sign: auth.sign,

            cuit: process.env.AFIP_CUIT || "",

            pointOfSale: POINT_OF_SALE,

            voucherType: AFIP_INVOICE_TYPES.FACTURA_B,
        });

        const voucherNumber = lastVoucher + 1;

        /*
        |--------------------------------------------------------------------------
        | BUILD AFIP REQUEST
        |--------------------------------------------------------------------------
        */

        const feCAEReq = buildInvoiceRequest({
            pointOfSale: POINT_OF_SALE,

            voucherType: AFIP_INVOICE_TYPES.FACTURA_B,

            voucherNumber,

            customer: customerSnapshot,

            totals: totalsSnapshot,
        });

        /*
        |--------------------------------------------------------------------------
        | CREATE AFIP VOUCHER
        |--------------------------------------------------------------------------
        */

        const afipResponse = await createVoucher({
            token: auth.token,

            sign: auth.sign,

            cuit: process.env.AFIP_CUIT || "",

            feCAEReq,
        });

        /*
        |--------------------------------------------------------------------------
        | PARSE AFIP RESPONSE
        |--------------------------------------------------------------------------
        */

        const detail = afipResponse?.FeDetResp?.FECAEDetResponse;

        if (!detail?.CAE) {
            invoice.afipStatus = "rejected";

            invoice.afipErrors = afipResponse.Errors || [];

            invoice.afipObservations = afipResponse.Observaciones || [];

            await invoice.save();

            return Response.json(
                {
                    success: false,

                    error: "AFIP rejected invoice",

                    afipResponse,
                },
                {
                    status: 400,
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SAVE AFIP RESULT
        |--------------------------------------------------------------------------
        */

        invoice.voucherNumber = voucherNumber;

        invoice.cae = detail.CAE;

        invoice.caeExpiration = detail.CAEFchVto;

        invoice.afipStatus = "authorized";

        invoice.afipResult = afipResponse.Resultado;

        invoice.afipResponse = afipResponse;

        await invoice.save();

        /*
        |--------------------------------------------------------------------------
        | LINK ORDER
        |--------------------------------------------------------------------------
        */

        await OrderModel.findByIdAndUpdate(orderId, {
            $push: {
                invoices: invoice._id,
            },
        });

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return Response.json({
            success: true,

            invoice,
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
