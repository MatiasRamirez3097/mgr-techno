import { NextResponse } from "next/server";
import { resolveStockCount } from "@/services/stockCounts/resolveStockCount";
import { getAdminActor, handlePendingSaleError, unauthorized } from "@/app/api/admin/pending-sales/adminSession";

/** Resuelve la diferencia de un conteo: `{ action: "adjust" | "pending_sale" | "dismiss", reason?, notes? }`. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const actor = await getAdminActor();
    if (!actor) return unauthorized();
    try {
        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        return NextResponse.json({ success: true, data: await resolveStockCount(id, body, actor) });
    } catch (error) {
        return handlePendingSaleError(error, "Error resolviendo el conteo");
    }
}
