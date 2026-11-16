import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unlinkProductDistributor } from "@/services/distributors/links/unlinkProductDistributor";

interface Props {
    params: Promise<{ id: string; linkId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Props) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { id, linkId } = await params;
        const deleted = await unlinkProductDistributor(id, linkId);
        if (!deleted) {
            return NextResponse.json({ error: "Vínculo no encontrado" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        console.error("Error en DELETE distributor-links:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al desvincular" },
            { status: 500 },
        );
    }
}
