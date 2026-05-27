import { connectDB } from "@/lib/mongodb";

import { generateVoucher } from "@/services/vouchers/generateVoucher";

export async function POST(req: Request, context: any) {
    try {
        await connectDB();

        const { id } = await context.params;

        const body = await req.json();
        console.log("body>>>", body);
        const voucher = await generateVoucher({
            orderId: id,

            type: body.type,

            fiscalType: body.fiscalType,

            relatedVoucherId: body.relatedVoucherId,
        });

        return Response.json({
            success: true,
            voucher,
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
