import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProductDistributorLinks } from "@/services/distributors/links/getProductDistributorLinks";
import { linkProductToDistributor } from "@/services/distributors/links/linkProductToDistributor";

interface Props {
    params: Promise<{ id: string }>;
}

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return Boolean(session && (session as { role?: string }).role === "administrator");
}

export async function GET(_req: NextRequest, { params }: Props) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { id } = await params;
        const links = await getProductDistributorLinks(id);
        return NextResponse.json({ links });
    } catch (err: unknown) {
        console.error("Error en GET distributor-links:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al obtener vínculos" },
            { status: 500 },
        );
    }
}

export async function POST(req: NextRequest, { params }: Props) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const { id } = await params;
        const link = await linkProductToDistributor(id, await req.json());
        return NextResponse.json({ success: true, link });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al vincular";
        return NextResponse.json(
            { error: message },
            { status: message.includes("no encontrado") ? 404 : 400 },
        );
    }
}
