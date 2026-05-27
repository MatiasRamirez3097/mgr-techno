import { mapOrderToDocument } from "@/lib/pdf/mappers/mapOrderToDocument";

import { orderDocumentTemplate } from "@/lib/pdf/templates/orderDocumentTemplate";

import { generatePdf } from "@/lib/pdf/generators/generatePdf";

export async function generateVoucherPdf({ order, voucher }: any) {
    const data = mapOrderToDocument({
        order,
        voucher,
    });

    return generatePdf(await orderDocumentTemplate(data));
}
