import { NextResponse } from "next/server";
import { discardPendingSale } from "@/services/pendingSales/discardPendingSale";
import { getAdminActor, handlePendingSaleError, unauthorized } from "../../adminSession";

/** Descarta una venta escaneada y libera el stock reservado. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const actor = await getAdminActor();
    if (!actor) return unauthorized();
    try {
        const { id } = await params;
        return NextResponse.json({ success: true, data: await discardPendingSale(id, actor) });
    } catch (error) {
        return handlePendingSaleError(error, "Error descartando la venta");
    }
}
