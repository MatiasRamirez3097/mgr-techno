import { deleteProductById } from "@/services/products/deleteProductById";

import { updateProductById } from "@/services/products/updateProductById";

interface Props {
    params: Promise<{
        id: string;
    }>;
}

// =========================
// UPDATE PRODUCT
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
    } catch (error: any) {
        return Response.json(
            {
                error: error?.message || "Error al actualizar producto",
            },
            {
                status: 400,
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
    } catch (error: any) {
        return Response.json(
            {
                error: error?.message || "Error al eliminar producto",
            },
            {
                status: 400,
            },
        );
    }
}
