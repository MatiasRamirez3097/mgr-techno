export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { getAuthenticatedPdfUrl } from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";
import { OrderModel } from "@/models";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateVoucherToken } from "@/lib/auth";

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
        | AUTHORIZATION CHECK
        |------------------------------------------------------------------
        */

        const searchParams = _req.nextUrl.searchParams;
        const tokenParam = searchParams.get("token");
        const emailParam = searchParams.get("email");

        const session = await getServerSession(authOptions);

        let isAuthorized = false;

        // 1. Autorizado si tiene sesión activa de admin
        if (session && session.role === "administrator") {
            isAuthorized = true;
        }

        // 2. Autorizado si tiene sesión del cliente dueño del pedido
        if (
            session &&
            session.customerId &&
            order.customerId &&
            session.customerId === order.customerId.toString()
        ) {
            isAuthorized = true;
        }

        // 3. Autorizado si el email de sesión coincide con el email de la orden
        if (
            session &&
            session.user?.email &&
            order.customerEmail &&
            session.user.email.toLowerCase() === order.customerEmail.toLowerCase()
        ) {
            isAuthorized = true;
        }

        // 4. Autorizado si proviene del enlace seguro del email con token válido
        if (tokenParam && tokenParam === generateVoucherToken(voucherId)) {
            isAuthorized = true;
        }

        // 5. Autorizado si se envía el email del cliente en query param
        if (
            emailParam &&
            order.customerEmail &&
            emailParam.toLowerCase() === order.customerEmail.toLowerCase()
        ) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            return Response.json(
                {
                    success: false,
                    error: "No autorizado para descargar este comprobante",
                },
                { status: 403 },
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
                "Content-Disposition": `attachment; filename="${fileName}"`,
            },
        });
    } catch (error: unknown) {
        console.error(error);

        const errorMessage =
            error instanceof Error ? error.message : "Internal server error";

        return Response.json(
            {
                success: false,
                error: errorMessage,
            },
            {
                status: 500,
            },
        );
    }
}
