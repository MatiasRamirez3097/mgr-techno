import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { syncAirCatalog } from "@/services/distributors/air/syncAirCatalog";
import { getAirSyncStatus } from "@/services/distributors/air/getAirSyncStatus";
import { getAirCategories } from "@/services/distributors/air/getAirCategories";

// Login en la intranet de AIR y descarga de la lista completa
export const maxDuration = 120;

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
            getAirSyncStatus(),
            getAirCategories(),
        ]);
        return NextResponse.json({ status, categories });
    } catch (err: unknown) {
        console.error("Error obteniendo el estado de AIR:", err);
        return NextResponse.json(
            { error: "Error obteniendo el estado de AIR" },
            { status: 500 },
        );
    }
}

// Sincronización manual ("Sincronizar ahora")
export async function POST() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await syncAirCatalog();
    const httpStatus =
        result.status === "error" ? 502 : result.status === "skipped" ? 409 : 200;

    return NextResponse.json(result, { status: httpStatus });
}
