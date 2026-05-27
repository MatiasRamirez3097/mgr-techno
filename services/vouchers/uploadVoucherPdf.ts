import { uploadBuffer } from "@/lib/cloudinary";

interface Props {
    buffer: Buffer;

    orderId: string;

    voucherNumber: string;
}

export async function uploadVoucherPdf({
    buffer,
    orderId,
    voucherNumber,
}: Props) {
    const safeFileName = voucherNumber.replace(/[^\w-]/g, "_");

    return uploadBuffer({
        buffer,

        folder: `mgrtechno/vouchers/orders/${orderId}`,

        fileName: safeFileName,
    });
}
