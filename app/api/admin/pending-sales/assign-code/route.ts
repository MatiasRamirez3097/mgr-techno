import { NextResponse } from "next/server";
import { assignProductCode } from "@/services/pendingSales/assignProductCode";
import { getAdminActor, handlePendingSaleError, unauthorized } from "../adminSession";

/** Vincula un código escaneado (GTIN, SKU o MPN) a un producto. */
export async function POST(req: Request) {
    if (!(await getAdminActor())) return unauthorized();
    try {
        const body = await req.json().catch(() => ({}));
        return NextResponse.json({ success: true, data: await assignProductCode(body) });
    } catch (error) {
        return handlePendingSaleError(error, "Error guardando el código");
    }
}
