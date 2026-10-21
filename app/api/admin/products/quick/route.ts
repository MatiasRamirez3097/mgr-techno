import { NextRequest, NextResponse } from "next/server";
import { createQuickProduct } from "@/services/products/createQuickProduct";
import { createQuickProductSchema } from "@/lib/validators/productSchema";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = createQuickProductSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: parsed.error.issues[0]?.message || "Datos inválidos",
                    details: parsed.error.issues,
                },
                { status: 400 },
            );
        }

        const product = await createQuickProduct(parsed.data);

        return NextResponse.json({
            success: true,
            data: product,
            product,
            message: "Producto rápido creado exitosamente (pendiente de revisión)",
        });
    } catch (error: unknown) {
        console.error("Error al crear producto rápido:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno al crear el producto rápido",
            },
            { status: 500 },
        );
    }
}
