// /services/invoices/createInvoice.ts

import { InvoiceModel } from "@/models";

import { AFIP_VOUCHER_TYPES, AfipVoucherType } from "@/lib/afip/constants";

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
    const type: AfipVoucherType = invoice.type;
    const voucherType = AFIP_VOUCHER_TYPES[type];

    const pointOfSale = 1;

    const lastVoucher = await getLastVoucher({
        token: auth.token,
        sign: auth.sign,

        cuit: process.env.AFIP_CUIT || "",

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

        cuit: process.env.AFIP_CUIT || "",

        feCAEReq: payload,
    });

    const detail = response?.json?.FeDetResp?.FECAEDetResponse?.[0];

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
