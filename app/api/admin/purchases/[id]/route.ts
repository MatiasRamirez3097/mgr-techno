import { updatePurchase } from "@/lib/purchases/updatePurchase";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { z } from "zod";
import { PurchaseModel } from "@/models/Purchase";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const body = await req.json();

        const purchase = await updatePurchase(id, body);

        return Response.json(
            {
                success: true,
                data: purchase,
            },
            { status: 200 },
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json(
                {
                    success: false,
                    error: "Datos inválidos",
                    details: error.issues,
                },
                { status: 400 },
            );
        }

        const message =
            error instanceof Error ? error.message : "Error desconocido";

        const status = message.includes("no encontrada")
            ? 404
            : message.includes("No se puede editar")
              ? 400
              : 500;

        return Response.json(
            {
                success: false,
                error: message,
            },
            { status },
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        await connectDB();

        const purchase = await PurchaseModel.findById(id);
        if (!purchase) {
            return Response.json(
                { success: false, error: "Compra no encontrada" },
                { status: 404 },
            );
        }

        // Regla de negocio: solo se permite eliminar compras en estado draft o cancelled
        if (purchase.status !== "draft" && purchase.status !== "cancelled") {
            return Response.json(
                {
                    success: false,
                    error: `No se puede eliminar una compra en estado "${purchase.status}". Solo se pueden eliminar borradores o compras canceladas.`,
                },
                { status: 409 },
            );
        }

        await PurchaseModel.findByIdAndDelete(id);
        return Response.json({ success: true, ok: true }, { status: 200 });
    } catch (error) {
        return Response.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Error al eliminar la compra",
            },
            { status: 500 },
        );
    }
}
