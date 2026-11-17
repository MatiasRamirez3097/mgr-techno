import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { unlinkProductReference } from "@/services/priceReference/links/unlinkProductReference";

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
        await unlinkProductReference(id, linkId);
        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al desvincular";
        return NextResponse.json(
            { error: message },
            { status: message.includes("no encontrado") ? 404 : 500 },
        );
    }
}
