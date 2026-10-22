import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { convertQuoteToOrder } from "@/services/quotes/convertQuoteToOrder";

interface Params {
    params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session as any).role !== "administrator") {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;
        const result = await convertQuoteToOrder(id);

        return NextResponse.json({
            success: true,
            orderId: result.orderId,
            quoteNumber: result.quoteNumber,
            message: "Presupuesto convertido a orden de venta con éxito",
        });
    } catch (err: unknown) {
        console.error("Error converting quote to order:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al convertir presupuesto a orden" },
            { status: 400 },
        );
    }
}
