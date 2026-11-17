import { NextRequest, NextResponse } from "next/server";
import { syncInvidCatalog } from "@/services/distributors/invid/syncInvidCatalog";
import { syncPcmoddCatalog } from "@/services/distributors/pcmodd/syncPcmoddCatalog";
import { getUsdExchangeRate } from "@/services/exchangeRates/getUsdExchangeRate";

// Recorrer el catálogo completo lleva unas 15 páginas secuenciales
export const maxDuration = 300;

// Llamado por Vercel Cron (vercel.json) cada hora; Vercel envía `Authorization: Bearer <CRON_SECRET>`.
// También lee la hoja de PCMODD (un solo pedido; si falta PCMODD_SHEET_URL, se saltea)
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const [usd, invid, pcmodd] = await Promise.all([
        getUsdExchangeRate({ forceRefresh: true }),
        syncInvidCatalog(),
        syncPcmoddCatalog(),
    ]);

    return NextResponse.json({ usdRate: usd?.rate ?? null, invid, pcmodd });
}
