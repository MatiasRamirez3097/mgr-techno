import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { syncInvidCatalog } from "@/services/distributors/invid/syncInvidCatalog";
import { getInvidSyncStatus } from "@/services/distributors/invid/getInvidSyncStatus";
import { getInvidCategories } from "@/services/distributors/invid/getInvidCategories";

// Recorrer el catálogo completo lleva unas 15 páginas secuenciales
export const maxDuration = 300;

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return Boolean(session && (session as { role?: string }).role === "administrator");
}

// Estado de la sincronización y categorías presentes en el catálogo local
export async function GET() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const [status, categories] = await Promise.all([
            getInvidSyncStatus(),
            getInvidCategories(),
        ]);
        return NextResponse.json({ status, categories });
    } catch (err: unknown) {
        console.error("Error obteniendo el estado de Invid:", err);
        return NextResponse.json(
            { error: "Error obteniendo el estado de Invid" },
            { status: 500 },
        );
    }
}

// Sincronización manual ("Sincronizar ahora")
export async function POST() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await syncInvidCatalog();
    const httpStatus =
        result.status === "error" ? 502 : result.status === "skipped" ? 409 : 200;

    return NextResponse.json(result, { status: httpStatus });
}
