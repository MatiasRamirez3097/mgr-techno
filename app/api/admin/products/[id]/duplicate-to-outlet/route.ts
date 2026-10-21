import { NextResponse } from "next/server";
import { duplicateProductToOutlet } from "@/services/products/duplicateToOutlet";

interface Props {
    params: Promise<{
        id: string;
    }>;
}

export async function POST(req: Request, { params }: Props) {
    try {
        const { id } = await params;
        const result = await duplicateProductToOutlet(id);

        return NextResponse.json({
            success: true,
            id: result.id,
            message: "Producto de Outlet creado correctamente",
        });
    } catch (error: unknown) {
        console.error("Error al duplicar producto a outlet:", error);
        const status =
            error instanceof Error && error.message.includes("no encontrado")
                ? 404
                : 500;
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno del servidor al duplicar el producto",
            },
            { status },
        );
    }
}
