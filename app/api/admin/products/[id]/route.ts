import { deleteProductById } from "@/services/products/deleteProductById";
import {
    updateProductById,
    updateProductQuickFields,
} from "@/services/products/updateProductById";

interface Props {
    params: Promise<{
        id: string;
    }>;
}

// =========================
// UPDATE PRODUCT (FULL)
// =========================

export async function PUT(req: Request, { params }: Props) {
    try {
        const { id } = await params;

        const body = await req.json();
        const product = await updateProductById(id, body);

        return Response.json({
            success: true,
            product,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Error al actualizar producto";
        const status = message.includes("no encontrado") ? 404 : 400;

        return Response.json(
            {
                error: message,
            },
            {
                status,
            },
        );
    }
}

// =========================
// UPDATE PRODUCT (PARTIAL)
// =========================

export async function PATCH(req: Request, { params }: Props) {
    try {
        const { id } = await params;

        const body = await req.json();

        const product = await updateProductQuickFields(id, body);

        return Response.json({
            success: true,
            product,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Error al actualizar producto";
        const status = message.includes("no encontrado") ? 404 : 400;

        return Response.json(
            {
                error: message,
            },
            {
                status,
            },
        );
    }
}

// =========================
// DELETE PRODUCT
// =========================

export async function DELETE(req: Request, { params }: Props) {
    try {
        const { id } = await params;

        await deleteProductById(id);

        return Response.json({
            success: true,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Error al eliminar producto";
        const status = message.includes("no encontrado")
            ? 404
            : message.includes("No se puede eliminar")
              ? 409
              : 500;

        return Response.json(
            {
                error: message,
            },
            {
                status,
            },
        );
    }
}
