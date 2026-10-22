import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateQuotePdf } from "@/services/quotes/generateQuotePdf";

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
        const { buffer, fileName } = await generateQuotePdf(id);

        return new Response(buffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Content-Length": buffer.length.toString(),
            },
        });
    } catch (err: unknown) {
        console.error("Error generating quote PDF:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al generar PDF del presupuesto" },
            { status: 500 },
        );
    }
}
