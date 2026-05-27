interface Params {
    order: any;

    type: string;

    fiscalType?: string;

    relatedVoucherId?: string;
}

export async function validateVoucherGeneration({
    order,
    type,
    relatedVoucherId,
}: Params) {
    /*
    |------------------------------------------------------------------
    | PAYMENT
    |------------------------------------------------------------------
    */

    if (type === "fiscal_invoice") {
        if (order.paymentStatus !== "paid") {
            throw new Error("Cannot generate fiscal invoice for unpaid order");
        }
    }

    /*
    |------------------------------------------------------------------
    | DUPLICATED FISCAL INVOICE
    |------------------------------------------------------------------
    */

    if (type === "fiscal_invoice") {
        const existingInvoice = order.vouchers.find(
            (voucher: any) =>
                voucher.type === "fiscal_invoice" &&
                voucher.status === "issued",
        );

        if (existingInvoice) {
            throw new Error("Order already has an issued fiscal invoice");
        }
    }

    /*
    |------------------------------------------------------------------
    | CREDIT NOTE
    |------------------------------------------------------------------
    */

    if (type === "credit_note") {
        if (!relatedVoucherId) {
            throw new Error("Credit note requires related voucher");
        }

        const relatedVoucher = order.vouchers.id(relatedVoucherId);

        if (!relatedVoucher) {
            throw new Error("Related voucher not found");
        }
    }
}
