import { getAuth } from "@/lib/afip/auth/getAuth";

import { getLastVoucher } from "@/lib/afip/wsfe/getLastVoucher";

import { buildInvoiceRequest } from "@/lib/afip/wsfe/buildInvoiceRequest";

import { createVoucher } from "@/lib/afip/wsfe/createVoucher";

import { generateAfipQr } from "@/lib/afip/qr/generateAfipQr";

import { AFIP_DOCUMENT_TYPES, AFIP_INVOICE_TYPES } from "@/lib/afip/constants";

const POINT_OF_SALE = 5;

interface Props {
    order: any;

    voucher: any;

    fiscalType: "A" | "B";
}

export async function generateFiscalVoucher({
    order,
    voucher,
    fiscalType,
}: Props) {
    try {
        /*
        |------------------------------------------------------------------
        | AFIP AUTH
        |------------------------------------------------------------------
        */

        const auth = await getAuth();

        /*
        |------------------------------------------------------------------
        | AFIP VOUCHER TYPE
        |------------------------------------------------------------------
        */

        const voucherTypeMap = {
            A: AFIP_INVOICE_TYPES.FACTURA_A,
            B: AFIP_INVOICE_TYPES.FACTURA_B,
            // C: AFIP_INVOICE_TYPES.FACTURA_C,
            // M: AFIP_INVOICE_TYPES.FACTURA_M,
        };

        const afipVoucherType = voucherTypeMap[fiscalType];

        /*
        |------------------------------------------------------------------
        | GET LAST VOUCHER
        |------------------------------------------------------------------
        */

        const lastVoucher = await getLastVoucher({
            token: auth.token,

            sign: auth.sign,

            cuit: process.env.AFIP_CUIT || "",

            pointOfSale: POINT_OF_SALE,

            voucherType: afipVoucherType,
        });

        if (lastVoucher === -1) {
            throw new Error("Error getting last AFIP voucher");
        }

        const voucherNumber = lastVoucher + 1;

        /*
        |------------------------------------------------------------------
        | BUILD REQUEST
        |------------------------------------------------------------------
        */

        const payload = buildInvoiceRequest({
            order: order.toObject(),

            voucherNumber,

            pointOfSale: POINT_OF_SALE,

            voucherType: afipVoucherType,
        });

        /*
        |------------------------------------------------------------------
        | CREATE AFIP VOUCHER
        |------------------------------------------------------------------
        */

        const afipResponse = await createVoucher({
            token: auth.token,

            sign: auth.sign,

            cuit: process.env.AFIP_CUIT || "",

            feCAEReq: payload,
        });

        /*
        |------------------------------------------------------------------
        | RESPONSE
        |------------------------------------------------------------------
        */

        const detail = afipResponse?.json?.FeDetResp?.FECAEDetResponse;

        if (!detail?.CAE) {
            throw new Error("AFIP rejected voucher");
        }

        /*
        |------------------------------------------------------------------
        | FISCAL NUMBER
        |------------------------------------------------------------------
        */

        const fiscalNumber = `${String(POINT_OF_SALE).padStart(
            5,
            "0",
        )}-${String(voucherNumber).padStart(8, "0")}`;

        /*
        |------------------------------------------------------------------
        | CUSTOMER DOCUMENT
        |------------------------------------------------------------------
        */

        const customerDocumentType =
            order.billing?.document?.type || AFIP_DOCUMENT_TYPES.DNI;

        const customerDocumentNumber = order.billing?.document?.number || "";

        /*
        |------------------------------------------------------------------
        | QR
        |------------------------------------------------------------------
        */

        const qr = generateAfipQr({
            cuit: Number(process.env.AFIP_CUIT),

            pointOfSale: POINT_OF_SALE,

            voucherType: afipVoucherType,

            voucherNumber,

            total: payload.FeCAEReq.FeDetReq.FECAEDetRequest[0].ImpTotal,

            documentType: customerDocumentType,

            documentNumber: Number(customerDocumentNumber),

            cae: detail.CAE,

            date: new Date().toISOString().split("T")[0],
        });

        /*
        |------------------------------------------------------------------
        | UPDATE INTERNAL VOUCHER NUMBER
        |------------------------------------------------------------------
        */

        voucher.number = fiscalNumber;

        /*
        |------------------------------------------------------------------
        | RETURN FISCAL DATA
        |------------------------------------------------------------------
        */

        return {
            cae: detail.CAE,

            caeExpirationDate: new Date(
                detail.CAEFchVto.toString().replace(
                    /(\d{4})(\d{2})(\d{2})/,
                    "$1-$2-$3",
                ),
            ),

            fiscalNumber,

            fiscalPointOfSale: POINT_OF_SALE,

            fiscalType,

            afipAuthorizedAt: new Date(),

            qrData: qr.qrPayload,
        };
    } catch (error: any) {
        console.error(error);

        throw new Error(error.message || "Failed to generate fiscal voucher");
    }
}
