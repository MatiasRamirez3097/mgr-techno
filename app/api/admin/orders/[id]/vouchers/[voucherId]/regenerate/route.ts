export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";

import { OrderModel } from "@/models";

import { mapOrderToDocument } from "@/lib/pdf/mappers/mapOrderToDocument";

import { orderDocumentTemplate } from "@/lib/pdf/templates/orderDocumentTemplate";

import { generatePdf } from "@/lib/pdf/generators/generatePdf";

import { deleteImage, uploadBuffer } from "@/lib/cloudinary";

export async function POST(
    _req: Request,
    context: {
        params: Promise<{
            id: string;
            voucherId: string;
        }>;
    },
) {
    try {
        await connectDB();

        const { id, voucherId } = await context.params;

        /*
        |------------------------------------------------------------------
        | ORDER
        |------------------------------------------------------------------
        */

        const order = await OrderModel.findById(id);

        if (!order) {
            return Response.json(
                {
                    success: false,

                    error: "Order not found",
                },
                {
                    status: 404,
                },
            );
        }

        /*
        |------------------------------------------------------------------
        | VOUCHER
        |------------------------------------------------------------------
        */

        const voucher = order.vouchers.id(voucherId);

        if (!voucher) {
            return Response.json(
                {
                    success: false,

                    error: "Voucher not found",
                },
                {
                    status: 404,
                },
            );
        }

        /*
        |------------------------------------------------------------------
        | MAP DOCUMENT DATA
        |------------------------------------------------------------------
        */

        const data = mapOrderToDocument({
            order: order.toObject(),

            voucher: voucher.toObject(),
        });

        /*
        |------------------------------------------------------------------
        | GENERATE HTML
        |------------------------------------------------------------------
        */

        const html = await orderDocumentTemplate(data);

        /*
        |------------------------------------------------------------------
        | GENERATE PDF
        |------------------------------------------------------------------
        */

        const pdf = await generatePdf(html);

        /*
        |------------------------------------------------------------------
        | DELETE OLD PDF
        |------------------------------------------------------------------
        */

        if (voucher.publicId) {
            try {
                await deleteImage(voucher.publicId);
            } catch (error) {
                console.error("Error deleting old PDF", error);
            }
        }

        /*
        |------------------------------------------------------------------
        | UPLOAD NEW PDF
        |------------------------------------------------------------------
        */

        const upload = await uploadBuffer({
            buffer: pdf,

            folder: `mgrtechno/orders/${order._id}/vouchers`,

            fileName: voucher.number,
        });

        /*
        |------------------------------------------------------------------
        | UPDATE VOUCHER
        |------------------------------------------------------------------
        */

        voucher.url = upload.secure_url;

        voucher.publicId = upload.public_id;

        voucher.pdfGeneratedAt = new Date();

        await order.save();

        /*
        |------------------------------------------------------------------
        | RESPONSE
        |------------------------------------------------------------------
        */

        return Response.json({
            success: true,

            voucher: {
                id: voucher._id,

                number: voucher.number,

                url: voucher.url,
            },
        });
    } catch (error: any) {
        console.error(error);

        return Response.json(
            {
                success: false,

                error: error.message || "Internal server error",
            },
            {
                status: 500,
            },
        );
    }
}
