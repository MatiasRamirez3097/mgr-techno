import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { updateStockCountSettings } from "@/services/settings/updateStockCountSettings";
import { getAdminActor, unauthorized } from "@/app/api/admin/pending-sales/adminSession";

export async function PUT(req: Request) {
    if (!(await getAdminActor())) return unauthorized();
    try {
        const settings = await updateStockCountSettings(await req.json());
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || "Valores inválidos" }, { status: 400 });
        }
        console.error("Error guardando la configuración del conteo de stock:", error);
        return NextResponse.json({ error: "Error guardando la configuración" }, { status: 500 });
    }
}
