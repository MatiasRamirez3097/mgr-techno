import { NextRequest, NextResponse } from "next/server";
import { runDailyDeals } from "@/services/dailyDeals/runDailyDeals";

export const maxDuration = 120;

// Vercel Cron a las 00:00 de Argentina (03:00 UTC, vercel.json): termina la oferta de ayer y
// genera la de hoy. Vercel envía `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        return NextResponse.json(await runDailyDeals());
    } catch (error) {
        console.error("Error en el ciclo de ofertas del día:", error);
        return NextResponse.json({ error: "Error en las ofertas del día" }, { status: 500 });
    }
}
