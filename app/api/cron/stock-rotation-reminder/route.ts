import { NextRequest, NextResponse } from "next/server";
import { notifyStockRotation } from "@/services/inventory/notifyStockRotation";

// Vercel Cron los lunes a las 9:00 de Argentina (12:00 UTC, vercel.json): resumen de "Stock a
// rotar" a Discord, si está habilitado en la configuración. Vercel envía
// `Authorization: Bearer <CRON_SECRET>`.
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        return NextResponse.json(await notifyStockRotation());
    } catch (error) {
        console.error("Error en el resumen de stock a rotar:", error);
        return NextResponse.json({ error: "Error en el resumen de stock a rotar" }, { status: 500 });
    }
}
