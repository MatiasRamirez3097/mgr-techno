import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dismissLinkSuggestion } from "@/services/distributors/links/dismissLinkSuggestion";

interface Props {
    params: Promise<{ id: string }>;
}

// Descarta una sugerencia de vínculo: queda guardada para no volver a sugerirla
export async function DELETE(_req: NextRequest, { params }: Props) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { id } = await params;
        await dismissLinkSuggestion(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Error al descartar la sugerencia";
        return NextResponse.json({ error: message }, { status: message.includes("no encontrada") ? 404 : 500 });
    }
}
