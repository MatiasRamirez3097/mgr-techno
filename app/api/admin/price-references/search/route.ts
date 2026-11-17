import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { REFERENCE_SOURCE_KEYS } from "@/lib/priceReference/sources";
import { searchReferenceCatalog } from "@/services/priceReference/links/searchReferenceCatalog";

// Búsqueda manual en los catálogos de referencia de precio (?q=texto&source=clave opcional)
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const q = req.nextUrl.searchParams.get("q")?.slice(0, 200) ?? "";
    const source = req.nextUrl.searchParams.get("source") || undefined;
    if (source && !REFERENCE_SOURCE_KEYS.includes(source)) {
        return NextResponse.json({ error: "Fuente desconocida" }, { status: 400 });
    }
    try {
        return NextResponse.json({ items: await searchReferenceCatalog(q, { source }) });
    } catch (err: unknown) {
        console.error("Error en búsqueda de referencias:", err);
        return NextResponse.json({ error: "Error al buscar" }, { status: 500 });
    }
}
