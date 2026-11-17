import { NextRequest, NextResponse } from "next/server";
import { REFERENCE_SOURCES } from "@/lib/priceReference/sources";
import { syncReferenceSource } from "@/services/priceReference/syncReferenceSource";

// Cada pasada lee páginas de producto durante unos 4 minutos
export const maxDuration = 300;

// Llamado por Vercel Cron (vercel.json) cada hora; Vercel envía `Authorization: Bearer <CRON_SECRET>`
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Las fuentes son sitios distintos: se actualizan en paralelo
    const results = await Promise.all(REFERENCE_SOURCES.map(syncReferenceSource));
    return NextResponse.json({ results });
}
