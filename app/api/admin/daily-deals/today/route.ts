import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cancelTodayDeal } from "@/services/dailyDeals/cancelTodayDeal";
import { createTodayDeal } from "@/services/dailyDeals/createTodayDeal";
import { startDailyDealsNow } from "@/services/dailyDeals/startDailyDealsNow";

/**
 * Acciones sobre la oferta de hoy: `start` (adelanta un inicio programado y genera la de hoy),
 * `generate` (si no hay una activa), `regenerate` (cancela la
 * actual y sortea otra) y `cancel` (restaura los precios; el resto del día queda sin oferta,
 * salvo que se genere otra a mano).
 */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { action } = (await req.json().catch(() => ({}))) as { action?: string };
    try {
        if (action === "cancel") {
            return NextResponse.json({ success: true, ...(await cancelTodayDeal()) });
        }
        if (action === "start") {
            return NextResponse.json({ success: true, result: await startDailyDealsNow() });
        }
        if (action === "generate" || action === "regenerate") {
            const excludeProductIds = action === "regenerate" ? (await cancelTodayDeal()).productIds : [];
            return NextResponse.json({
                success: true,
                result: await createTodayDeal(new Date(), { replaceCancelled: true, excludeProductIds }),
            });
        }
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    } catch (error) {
        console.error("Error en la oferta del día:", error);
        return NextResponse.json({ error: "Error actualizando la oferta del día" }, { status: 500 });
    }
}
