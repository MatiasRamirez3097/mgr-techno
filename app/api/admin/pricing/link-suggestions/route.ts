import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateLinkSuggestions } from "@/services/distributors/links/generateLinkSuggestions";

// Recorre los catálogos de Elit (~19 páginas) y NewBytes
export const maxDuration = 300;

// Búsqueda manual de sugerencias de vínculo (también corre sola todos los días)
export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const result = await generateLinkSuggestions();
        if (result.skipped) {
            return NextResponse.json(
                { error: "Ya hay una búsqueda en curso. Probá de nuevo en unos minutos." },
                { status: 409 },
            );
        }
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error("Error buscando sugerencias de vínculo:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Error buscando sugerencias" },
            { status: 500 },
        );
    }
}
