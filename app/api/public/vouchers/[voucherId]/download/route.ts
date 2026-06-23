export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";

import { getAuthenticatedPdfUrl } from "@/lib/cloudinary";

import { OrderModel } from "@/models";

export async function GET(
    _req: Request,
    context: {
        params: Promise<{
            voucherId: string;
        }>;
    },
) {
    try {
        await connectDB();

        const { voucherId } = await context.params;

        /*
        |------------------------------------------------------------------
        | FIND ORDER WITH VOUCHER
        |------------------------------------------------------------------
        */

        const order = await OrderModel.findOne({
            "vouchers._id": voucherId,
        });

        if (!order) {
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
        | FIND VOUCHER
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
        | VALIDATE PDF
        |------------------------------------------------------------------
        */

        if (!voucher.publicId) {
            return Response.json(
                {
                    success: false,

                    error: "Voucher PDF not available",
                },
                {
                    status: 404,
                },
            );
        }

        /*
        |------------------------------------------------------------------
        | GENERATE SIGNED URL
        |------------------------------------------------------------------
        */

        const url = getAuthenticatedPdfUrl(voucher.publicId);

        /*
        |------------------------------------------------------------------
        | REDIRECT
        |------------------------------------------------------------------
        */

        return Response.redirect(url);
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
