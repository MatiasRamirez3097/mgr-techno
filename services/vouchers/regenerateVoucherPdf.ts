import { connectDB } from "@/lib/mongodb";
import { OrderModel } from "@/models";
import { generateVoucherPdf } from "./generateVoucherPdf";
import { deleteImage, uploadBuffer } from "@/lib/cloudinary";

interface Params {
    orderId: string;
    voucherId: string;
}

export async function regenerateVoucherPdf({ orderId, voucherId }: Params) {
    await connectDB();

    const order = await OrderModel.findById(orderId).populate({
        path: "items.allocations.inventoryItemId",
        model: "InventoryItem",
        select: "serialNumber productId",
    });

    if (!order) {
        throw new Error("Order not found");
    }

    const voucher = order.vouchers.id(voucherId);

    if (!voucher) {
        throw new Error("Voucher not found");
    }

    const pdfBuffer = await generateVoucherPdf({
        order,
        voucher,
    });

    if (voucher.publicId) {
        try {
            await deleteImage(voucher.publicId);
        } catch (error) {
            console.error("Error deleting old PDF", error);
        }
    }

    const upload = await uploadBuffer({
        buffer: pdfBuffer,
        folder: `mgrtechno/orders/${order._id}/vouchers`,
        fileName: voucher.number,
    });

    voucher.url = upload.secure_url;
    voucher.publicId = upload.public_id;
    voucher.pdfGeneratedAt = new Date(voucher?.generatedAt);

    await order.save();

    return {
        id: voucher._id,
        number: voucher.number,
        url: voucher.url,
    };
}
