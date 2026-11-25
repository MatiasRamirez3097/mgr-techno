import { NextRequest, NextResponse } from "next/server";
import { notifyStockCounts } from "@/services/stockCounts/notifyStockCounts";

// Vercel Cron a las 20:00 de Argentina (23:00 UTC, vercel.json): avisa a Discord si faltó contar o
// quedaron diferencias del conteo de stock. Vercel envía `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        return NextResponse.json(await notifyStockCounts());
    } catch (error) {
        console.error("Error avisando el conteo de stock:", error);
        return NextResponse.json({ error: "Error en el aviso del conteo de stock" }, { status: 500 });
    }
}
