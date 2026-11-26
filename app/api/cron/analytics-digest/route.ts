import { NextRequest, NextResponse } from "next/server";
import { notifyAnalyticsDigest } from "@/services/analytics/notifyAnalyticsDigest";

// Vercel Cron a las 08:00 de Argentina (11:00 UTC, vercel.json): resumen de las visitas de ayer
// en Discord. Vercel envía `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        return NextResponse.json(await notifyAnalyticsDigest());
    } catch (error) {
        console.error("Error enviando el resumen de visitas:", error);
        return NextResponse.json({ error: "Error en el resumen de visitas" }, { status: 500 });
    }
}
