import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateAnalyticsSettings } from "@/services/settings/updateAnalyticsSettings";

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const settings = await updateAnalyticsSettings(await req.json());
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || "Valores inválidos" }, { status: 400 });
        }
        console.error("Error guardando la configuración de visitas:", error);
        return NextResponse.json({ error: "Error guardando la configuración" }, { status: 500 });
    }
}
