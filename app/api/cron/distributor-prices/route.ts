import { NextRequest, NextResponse } from "next/server";
import { refreshRemoteLinkPrices } from "@/services/distributors/links/refreshRemoteLinkPrices";
import { notifyPriceAlerts } from "@/services/pricing/notifyPriceAlerts";

// Elit puede requerir recorrer ~19 páginas de su catálogo
export const maxDuration = 300;

// Llamado por Vercel Cron (vercel.json) todos los días a las 7:00 de Argentina (10:00 UTC);
// Vercel envía `Authorization: Bearer <CRON_SECRET>`
export async function GET(req: NextRequest) {
    if (
        !process.env.CRON_SECRET ||
        req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const refresh = await refreshRemoteLinkPrices();
    // El aviso se manda aunque la actualización haya fallado: Invid/AIR y los márgenes siguen valiendo
    const alerts = await notifyPriceAlerts(refresh.priceChanges).catch((err) => {
        console.error("Error enviando el aviso de precios:", err);
        return null;
    });

    return NextResponse.json({
        skipped: refresh.skipped ?? false,
        distributors: refresh.distributors,
        priceChanges: refresh.priceChanges.length,
        alerts,
    });
}
