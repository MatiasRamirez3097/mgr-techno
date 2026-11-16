import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { autoLinkProductsByCode } from "@/services/distributors/links/autoLinkProductsByCode";

// Cruza todo el catálogo propio contra Invid y AIR
export const maxDuration = 60;

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const report = await autoLinkProductsByCode();
        return NextResponse.json({ success: true, report });
    } catch (err: unknown) {
        console.error("Error en la vinculación automática:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error en la vinculación automática" },
            { status: 500 },
        );
    }
}
