// /services/invoices/createInvoice.ts

import InvoiceModel from "@/models/Invoice";

import { AFIP_VOUCHER_TYPES } from "@/lib/afip/constants";

import { getAuth } from "@/lib/afip/auth/getAuth";

import { getLastVoucher } from "@/lib/afip/wsfe/getLastVoucher";

import { createVoucher } from "@/lib/afip/wsfe/createVoucher";

import { buildVoucherPayload } from "@/lib/afip/adapters/buildVoucherPayload";

import { parseAfipError } from "@/lib/afip/utils/parseAfipError";

interface Params {
    invoiceId: string;
}

export async function createInvoice({ invoiceId }: Params) {
    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
        throw new Error("Invoice not found");
    }

    if (invoice.status === "authorized") {
        return invoice;
    }

    const auth = await getAuth();

    const voucherType = AFIP_VOUCHER_TYPES[invoice.type];

    const pointOfSale = 1;

    const lastVoucher = await getLastVoucher({
        token: auth.token,
        sign: auth.sign,

        cuit: Number(process.env.AFIP_CUIT),

        pointOfSale,

        voucherType,
    });

    const nextVoucher = lastVoucher + 1;

    const payload = buildVoucherPayload({
        invoice,
        voucherNumber: nextVoucher,
        pointOfSale,
        voucherType,
    });

    invoice.afipRequest = payload;

    await invoice.save();

    const response = await createVoucher({
        token: auth.token,
        sign: auth.sign,

        cuit: Number(process.env.AFIP_CUIT),

        payload,
    });

    const detail = response.FeDetResp?.FECAEDetResponse?.[0];

    if (detail?.Resultado !== "A") {
        invoice.status = "rejected";

        invoice.error = parseAfipError(response);

        invoice.afipResponse = response;

        await invoice.save();

        throw new Error(invoice.error);
    }

    invoice.status = "authorized";

    invoice.afip = {
        cae: detail.CAE,

        caeDueDate: detail.CAEFchVto,

        voucherNumber: nextVoucher,

        pointOfSale,

        voucherType,
    };

    invoice.afipResponse = response;

    await invoice.save();

    return invoice;
}
