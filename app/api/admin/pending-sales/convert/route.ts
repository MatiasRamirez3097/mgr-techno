import { NextResponse } from "next/server";
import { convertPendingSales } from "@/services/pendingSales/convertPendingSales";
import { getAdminActor, handlePendingSaleError, unauthorized } from "../adminSession";

/** Formaliza una o varias ventas escaneadas como un pedido. */
export async function POST(req: Request) {
    const actor = await getAdminActor();
    if (!actor) return unauthorized();
    try {
        const body = await req.json().catch(() => ({}));
        return NextResponse.json({ success: true, data: await convertPendingSales(body, actor) });
    } catch (error) {
        return handlePendingSaleError(error, "Error creando el pedido");
    }
}
