import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { suggestDistributorLinks } from "@/services/distributors/links/suggestDistributorLinks";

interface Props {
    params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Props) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { id } = await params;
        const suggestions = await suggestDistributorLinks(id);
        return NextResponse.json({ suggestions });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al buscar coincidencias";
        return NextResponse.json(
            { error: message },
            { status: message.includes("no encontrado") ? 404 : 500 },
        );
    }
}
