export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedPdfUrl } from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";
import { OrderModel } from "@/models";

export async function GET(
    _req: NextRequest,
    context: {
        params: Promise<{
            voucherId: string;
        }>;
    },
) {
    const { voucherId } = await context.params;

    try {
        await connectDB();

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
                { success: false, error: "Voucher not found" },
                { status: 404 },
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
                { success: false, error: "Voucher not found" },
                { status: 404 },
            );
        }

        /*
        |------------------------------------------------------------------
        | VALIDATE PDF
        |------------------------------------------------------------------
        */

        if (!voucher.publicId) {
            return Response.json(
                { success: false, error: "Voucher PDF not available" },
                { status: 404 },
            );
        }

        /*
        |------------------------------------------------------------------
        | CONSTRUIR NOMBRE DE ARCHIVO
        |------------------------------------------------------------------
        */

        // Replicamos la lógica del nombre del archivo aquí en el backend
        const formattedNumber = String(
            voucher.voucherNumber || voucher.number,
        ).padStart(8, "0");
        const pos = voucher.pointOfSale || "0000";
        const fileName =
            voucher.type === "fiscal_invoice"
                ? `Factura_${pos}-${formattedNumber}.pdf`
                : `Comprobante_${voucher.number}.pdf`;

        /*
        |------------------------------------------------------------------
        | GENERATE SIGNED URL & FORZAR DESCARGA
        |------------------------------------------------------------------
        */

        const url = getAuthenticatedPdfUrl(voucher.publicId);

        /*
        |------------------------------------------------------------------
        | REDIRECT
        |------------------------------------------------------------------
        */

        const response = await fetch(url);
        const blob = await response.blob();

        // 3. Devolvemos el archivo con el nombre que queremos, forzando la descarga
        return new NextResponse(blob, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Factura_${voucher.fiscalData?.fiscalType}-${voucher.fiscalData?.fiscalNumber}.pdf"`,
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
