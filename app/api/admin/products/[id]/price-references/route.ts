import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProductReferenceLinks } from "@/services/priceReference/links/getProductReferenceLinks";
import { linkProductToReference } from "@/services/priceReference/links/linkProductToReference";

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
        return NextResponse.json({ links: await getProductReferenceLinks(id) });
    } catch (err: unknown) {
        console.error("Error en GET price-references:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error al obtener referencias" },
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
        const link = await linkProductToReference(id, await req.json());
        return NextResponse.json({ success: true, link });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error al vincular";
        return NextResponse.json(
            { error: message },
            { status: message.includes("no encontrado") ? 404 : 400 },
        );
    }
}
