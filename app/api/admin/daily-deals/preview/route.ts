import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dailyDealSettingsSchema } from "@/lib/validators/dailyDealsSchema";
import { previewDailyDeals } from "@/services/dailyDeals/previewDailyDeals";

/** Simula el sorteo con la configuración del formulario (aunque no esté guardada). No cambia precios. */
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session as { role?: string }).role !== "administrator") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    try {
        const settings = dailyDealSettingsSchema.parse(await req.json());
        const preview = await previewDailyDeals(settings);
        return NextResponse.json({ preview });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: error.issues[0]?.message || "Valores inválidos" }, { status: 400 });
        }
        console.error("Error simulando las ofertas del día:", error);
        return NextResponse.json({ error: "Error simulando las ofertas del día" }, { status: 500 });
    }
}
