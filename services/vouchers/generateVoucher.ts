import { OrderModel } from "@/models";

import { validateVoucherGeneration } from "./validateVoucherGeneration";

import { generateFiscalVoucher } from "./generateFiscalVoucher";

import { generateVoucherPdf } from "./generateVoucherPdf";

import { uploadVoucherPdf } from "./uploadVoucherPdf";

import { generateVoucherNumber } from "./generateVoucherNumber";

interface Params {
    orderId: string;

    type:
        | "non_fiscal_receipt"
        | "fiscal_invoice"
        | "credit_note"
        | "debit_note";

    fiscalType?: "A" | "B";

    relatedVoucherId?: string;
}

export async function generateVoucher(params: Params) {
    const order = await OrderModel.findById(params.orderId);

    if (!order) {
        throw new Error("Order not found");
    }

    await validateVoucherGeneration({
        order,
        ...params,
    });

    const voucher = order.vouchers.create({
        type: params.type,

        number: await generateVoucherNumber(params.type),

        generatedAt: new Date(),

        status: "draft",

        relatedVoucherId: params.relatedVoucherId,

        totalsSnapshot: {
            subtotal: order.subtotal,
            total: order.total,
        },

        itemsSnapshot: order.items,
    });

    order.vouchers.push(voucher);

    await order.save();

    try {
        /*
        |------------------------------------------------------------------
        | FISCAL DATA
        |------------------------------------------------------------------
        */

        if (params.type === "fiscal_invoice") {
            voucher.fiscalData = await generateFiscalVoucher({
                order,
                voucher,
                fiscalType: params.fiscalType || "B",
            });
            console.log("asd>>>>", voucher.fiscalData);
        }

        /*
        |------------------------------------------------------------------
        | PDF
        |------------------------------------------------------------------
        */

        const pdfBuffer = await generateVoucherPdf({
            order,
            voucher,
        });

        /*
        |------------------------------------------------------------------
        | UPLOAD
        |------------------------------------------------------------------
        */

        const uploadResult = await uploadVoucherPdf({
            buffer: pdfBuffer,

            orderId: order.id,

            voucherNumber: voucher.number,
        });

        voucher.url = uploadResult.secure_url;

        voucher.publicId = uploadResult.public_id;

        /*
        |------------------------------------------------------------------
        | FINALIZE
        |------------------------------------------------------------------
        */

        voucher.status = "issued";

        voucher.generatedAt = new Date();

        await order.save();

        return voucher;
    } catch (error: any) {
        console.error(error);

        voucher.status = "cancelled";

        voucher.cancelReason = error.message || "Voucher generation failed";

        await order.save();

        throw error;
    }
}
