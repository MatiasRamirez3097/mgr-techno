import { connectDB } from "@/lib/mongodb";

import { OrderModel } from "@/models/Order";

import { getAuthenticatedPdfUrl } from "@/lib/cloudinary";

export async function GET(
    req: Request,
    context: {
        params: Promise<{
            id: string;
        }>;
    },
) {
    try {
        await connectDB();

        const { id } = await context.params;

        const order = await OrderModel.findById(id);

        if (!order?.receipt?.receiptPdfPublicId) {
            return Response.json(
                {
                    success: false,

                    error: "Receipt not found",
                },
                {
                    status: 404,
                },
            );
        }

        const url = getAuthenticatedPdfUrl(order.receipt.receiptPdfPublicId);

        return Response.json({
            success: true,

            url,
        });
    } catch (error: any) {
        return Response.json(
            {
                success: false,

                error: error.message,
            },
            {
                status: 500,
            },
        );
    }
}
