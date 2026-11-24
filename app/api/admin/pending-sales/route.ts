import { NextResponse } from "next/server";
import { createPendingSale } from "@/services/pendingSales/createPendingSale";
import { getPendingSales } from "@/services/pendingSales/getPendingSales";
import { getAdminActor, handlePendingSaleError, unauthorized } from "./adminSession";

/** Lista de ventas escaneadas; `?status=pending|converted|discarded|all` (default pending). */
export async function GET(req: Request) {
    if (!(await getAdminActor())) return unauthorized();
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") ?? "pending";
        const limit = Number(searchParams.get("limit")) || 100;
        return NextResponse.json({ success: true, data: await getPendingSales(status, limit) });
    } catch (error) {
        return handlePendingSaleError(error, "Error obteniendo las ventas pendientes");
    }
}

/** Registra una venta escaneada y reserva el stock. */
export async function POST(req: Request) {
    const actor = await getAdminActor();
    if (!actor) return unauthorized();
    try {
        const body = await req.json().catch(() => ({}));
        return NextResponse.json({ success: true, data: await createPendingSale(body, actor) });
    } catch (error) {
        return handlePendingSaleError(error, "Error registrando la venta");
    }
}
