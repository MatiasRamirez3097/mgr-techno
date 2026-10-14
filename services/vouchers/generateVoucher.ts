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

    date: string;
}

export async function generateVoucher(params: Params) {
    const order = await OrderModel.findById(params.orderId);
    const date = params.date;
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

        generatedAt: new Date(date),

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
                date: date,
            });
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

        voucher.generatedAt = new Date(date);

        await order.save();

        return voucher;
    } catch (error: unknown) {
        console.error(error);

        const errorMessage =
            error instanceof Error ? error.message : "Error desconocido";

        // Si ya fue autorizado por AFIP (posee CAE), no debe anularse el comprobante fiscal en la base local
        // Debe mantenerse para permitir regenerar el PDF sin perder la validez legal ante AFIP
        const hasAfipCae = Boolean(voucher.fiscalData?.cae);

        if (hasAfipCae) {
            voucher.status = "issued";
            voucher.cancelReason = `Error en generación/subida de PDF: ${errorMessage}`;
        } else {
            voucher.status = "cancelled";
            voucher.cancelReason = errorMessage;
        }

        await order.save();

        throw error;
    }
}
