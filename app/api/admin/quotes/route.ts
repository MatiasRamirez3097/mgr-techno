import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createQuote } from "@/services/quotes/createQuote";
import { getQuotes } from "@/services/quotes/getQuotes";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = Number(searchParams.get("page")) || 1;
        const limit = Number(searchParams.get("limit")) || 15;
        const search = searchParams.get("search") || undefined;
        const status = (searchParams.get("status") as any) || undefined;
        const customerId = searchParams.get("customerId") || undefined;

        const result = await getQuotes({
            page,
            limit,
            search,
            status,
            customerId,
        });

        return NextResponse.json(result);
    } catch (err: unknown) {
        console.error("Error in GET /api/admin/quotes:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al obtener presupuestos" },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const quote = await createQuote(body);

        return NextResponse.json({
            success: true,
            quote,
            message: "Presupuesto creado con éxito",
        });
    } catch (err: unknown) {
        console.error("Error in POST /api/admin/quotes:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al crear presupuesto" },
            { status: 400 },
        );
    }
}
