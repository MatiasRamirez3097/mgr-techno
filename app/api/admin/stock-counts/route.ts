import { NextResponse } from "next/server";
import { getStockCountsOverview } from "@/services/stockCounts/getStockCountsOverview";
import { recordStockCount } from "@/services/stockCounts/recordStockCount";
import { getAdminActor, handlePendingSaleError, unauthorized } from "@/app/api/admin/pending-sales/adminSession";

/** Lista de hoy, diferencias e historial; `?extra=N` suma N productos más a la lista. */
export async function GET(req: Request) {
    if (!(await getAdminActor())) return unauthorized();
    try {
        const extra = Math.min(50, Math.max(0, Number(new URL(req.url).searchParams.get("extra")) || 0));
        return NextResponse.json({ success: true, data: await getStockCountsOverview({ extra }) });
    } catch (error) {
        return handlePendingSaleError(error, "Error obteniendo los conteos");
    }
}

/** Guarda un conteo físico: `{ productId, counted, notes? }`. */
export async function POST(req: Request) {
    const actor = await getAdminActor();
    if (!actor) return unauthorized();
    try {
        const body = await req.json().catch(() => ({}));
        return NextResponse.json({ success: true, data: await recordStockCount(body, actor) });
    } catch (error) {
        return handlePendingSaleError(error, "Error guardando el conteo");
    }
}
