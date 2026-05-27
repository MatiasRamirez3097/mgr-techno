export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models/Order";
import { getAuth } from "@/lib/afip/auth/getAuth";
import { createVoucher } from "@/lib/afip/wsfe/createVoucher";
import { getLastVoucher } from "@/lib/afip/wsfe/getLastVoucher";
import { buildInvoiceRequest } from "@/lib/afip/wsfe/buildInvoiceRequest";
import { generateAfipQr } from "@/lib/afip/qr/generateAfipQr";
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

        const order = await OrderModel.findById(orderId);

        if (!order) {
            return Response.json(
                {
                    success: false,
                    error: "Order not found",
                },
                { status: 404 },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | VALIDACIONES
        |--------------------------------------------------------------------------
        */

        // Verificar si ya tiene factura fiscal
        const existingInvoice = order.vouchers?.find(
            (v: any) => v.type === "fiscal_invoice" && v.status === "issued",
        );

        if (existingInvoice) {
            return Response.json(
                {
                    success: false,
                    error: "Order already has a fiscal invoice",
                    invoice: existingInvoice,
                },
                { status: 400 },
            );
        }

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

        if (lastVoucher === -1) {
            throw new Error("Error al obtener nro ultimo voucher");
        }

        const voucherNumber = lastVoucher + 1;

        /*
        |--------------------------------------------------------------------------
        | BUILD AFIP REQUEST
        |--------------------------------------------------------------------------
        */

        const payload = buildInvoiceRequest({
            order: order.toObject(), // Convertir a plain object
            voucherNumber,
            pointOfSale: POINT_OF_SALE,
            voucherType: AFIP_INVOICE_TYPES.FACTURA_B,
        });

        /*
        |--------------------------------------------------------------------------
        | CREATE VOUCHER IN ORDER (status: draft)
        |--------------------------------------------------------------------------
        */

        const fiscalNumber = `${String(POINT_OF_SALE).padStart(5, "0")}-${String(voucherNumber).padStart(8, "0")}`;

        order.vouchers.push({
            type: "fiscal_invoice",
            number: fiscalNumber,
            status: "draft", // Empieza como borrador
            amount: payload.FeCAEReq.FeDetReq.FECAEDetRequest[0].ImpTotal,
            fiscalData: {
                fiscalNumber,
                fiscalPointOfSale: POINT_OF_SALE,
                fiscalType: "B",
            },
        });

        await order.save();

        const newVoucher = order.vouchers[order.vouchers.length - 1];

        console.log("payload>>>", payload.FeCAEReq.FeDetReq);
        console.log(
            "payload>>>",
            payload.FeCAEReq.FeDetReq.FECAEDetRequest[0].Iva,
        );

        /*
        |--------------------------------------------------------------------------
        | CREATE AFIP VOUCHER
        |--------------------------------------------------------------------------
        */

        console.log(auth);
        const afipResponse = await createVoucher({
            token: auth.token,
            sign: auth.sign,
            cuit: process.env.AFIP_CUIT || "",
            feCAEReq: payload,
        });

        /*
        |--------------------------------------------------------------------------
        | PARSE AFIP RESPONSE
        |--------------------------------------------------------------------------
        */

        const detail = afipResponse?.json;
        console.log("detail>>>", detail);

        if (!detail?.FeDetResp?.FECAEDetResponse?.CAE) {
            // AFIP rechazó la factura
            newVoucher.status = "cancelled";
            newVoucher.cancelReason = "AFIP rejected";

            // Guardar errores en un campo extra si querés trackearlos
            // Podrías agregar un campo `afipErrors` al VoucherSchema

            await order.save();

            return Response.json(
                {
                    success: false,
                    error: "AFIP rejected invoice",
                    afipErrors: afipResponse?.json?.Errors || [],
                    afipObservations: afipResponse?.json?.Observaciones || [],
                },
                { status: 400 },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | SAVE AFIP RESULT IN VOUCHER
        |--------------------------------------------------------------------------
        */

        const toSave = detail?.FeDetResp?.FECAEDetResponse;

        // Generar QR de AFIP
        const customerDocumentType =
            order.customer?.documentType ?? AFIP_DOCUMENT_TYPES.DNI;
        const customerDocumentNumber =
            order.customer?.documentNumber ??
            order.billing?.document?.number ??
            "";

        const qr = generateAfipQr({
            cuit: Number(process.env.AFIP_CUIT),
            pointOfSale: POINT_OF_SALE,
            voucherType: AFIP_INVOICE_TYPES.FACTURA_B,
            voucherNumber,
            total: payload.FeCAEReq.FeDetReq.FECAEDetRequest[0].ImpTotal,
            documentType: customerDocumentType,
            documentNumber: Number(customerDocumentNumber),
            cae: toSave.CAE,
            date: new Date().toISOString().split("T")[0],
        });

        // Actualizar el voucher con los datos de AFIP
        newVoucher.status = "issued";
        newVoucher.fiscalData.cae = toSave.CAE;
        newVoucher.fiscalData.caeExpirationDate = new Date(
            toSave.CAEFchVto.toString().replace(
                /(\d{4})(\d{2})(\d{2})/,
                "$1-$2-$3",
            ),
        );
        newVoucher.fiscalData.afipAuthorizedAt = new Date();
        newVoucher.fiscalData.qrData = qr.qrPayload;
        newVoucher.generatedAt = new Date();

        // Aquí generarías el PDF y lo subirías a Cloudinary/S3
        // newVoucher.url = await generateInvoicePDF(order, newVoucher);
        // newVoucher.publicId = "cloudinary_public_id";

        await order.save();

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return Response.json({
            success: true,
            voucher: newVoucher,
            qrUrl: qr.qrUrl,
            order: {
                _id: order._id,
                total: order.total,
                status: order.status,
            },
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,
                error: error.message || "Internal server error",
            },
            { status: 500 },
        );
    }
}
