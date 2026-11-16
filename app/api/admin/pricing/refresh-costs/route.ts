import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { refreshRemoteLinkPrices } from "@/services/distributors/links/refreshRemoteLinkPrices";

export const maxDuration = 300;

// Actualización manual de los costos de Elit y NewBytes (sin aviso a Discord)
export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const result = await refreshRemoteLinkPrices();
        if (result.skipped) {
            return NextResponse.json(
                { error: "Ya hay una actualización en curso. Probá de nuevo en unos minutos." },
                { status: 409 },
            );
        }
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error("Error actualizando costos de distribuidores:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error actualizando costos" },
            { status: 500 },
        );
    }
}
