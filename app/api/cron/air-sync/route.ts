import { NextRequest, NextResponse } from "next/server";
import { syncAirCatalog } from "@/services/distributors/air/syncAirCatalog";

// Login en la intranet de AIR y descarga de la lista completa (unos 360 KB)
export const maxDuration = 120;

// Llamado por Vercel Cron (vercel.json) cada hora; Vercel envía `Authorization: Bearer <CRON_SECRET>`
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const air = await syncAirCatalog();
    return NextResponse.json({ air });
}
