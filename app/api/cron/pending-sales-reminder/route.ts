import { NextRequest, NextResponse } from "next/server";
import { notifyPendingSales } from "@/services/pendingSales/notifyPendingSales";

// Vercel Cron a las 20:00 de Argentina (23:00 UTC, vercel.json): avisa a Discord si quedaron
// ventas escaneadas sin formalizar. Vercel envía `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        return NextResponse.json(await notifyPendingSales());
    } catch (error) {
        console.error("Error avisando ventas escaneadas pendientes:", error);
        return NextResponse.json({ error: "Error en el aviso de ventas pendientes" }, { status: 500 });
    }
}
