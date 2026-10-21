export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { regenerateVoucherPdf } from "@/services/vouchers/regenerateVoucherPdf";

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
        const { id, voucherId } = await context.params;
        const voucher = await regenerateVoucherPdf({ orderId: id, voucherId });

        return Response.json({
            success: true,
            voucher,
        });
    } catch (error: any) {
        console.error(error);
        const status = error.message?.includes("not found") ? 404 : 500;
        return Response.json(
            {
                success: false,
                error: error.message || "Internal server error",
            },
            { status },
        );
    }
}
