import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getQuoteById, deleteQuote } from "@/services/quotes/getQuoteById";
import { updateQuote } from "@/services/quotes/updateQuote";

interface Params {
    params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;
        const quote = await getQuoteById(id);

        if (!quote) {
            return NextResponse.json(
                { error: "Presupuesto no encontrado" },
                { status: 404 },
            );
        }

        return NextResponse.json({ quote });
    } catch (err: unknown) {
        console.error("Error in GET /api/admin/quotes/[id]:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al obtener presupuesto" },
            { status: 500 },
        );
    }
}

export async function PUT(req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const quote = await updateQuote(id, body);

        if (!quote) {
            return NextResponse.json(
                { error: "Presupuesto no encontrado" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            quote,
            message: "Presupuesto actualizado con éxito",
        });
    } catch (err: unknown) {
        console.error("Error in PUT /api/admin/quotes/[id]:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al actualizar presupuesto" },
            { status: 400 },
        );
    }
}

export async function DELETE(req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;
        const success = await deleteQuote(id);

        if (!success) {
            return NextResponse.json(
                { error: "Presupuesto no encontrado" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Presupuesto eliminado con éxito",
        });
    } catch (err: unknown) {
        console.error("Error in DELETE /api/admin/quotes/[id]:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al eliminar presupuesto" },
            { status: 500 },
        );
    }
}
