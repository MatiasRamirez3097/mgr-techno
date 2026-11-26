import { NextResponse, userAgent, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { trackEventSchema } from "@/lib/validators/trackEventSchema";
import { recordTrackEvent, type TrackRequestContext } from "@/services/analytics/recordTrackEvent";

function decodeHeader(value: string | null): string {
    if (!value) return "";
    try {
        return decodeURIComponent(value).slice(0, 100);
    } catch {
        return value.slice(0, 100);
    }
}

/**
 * Medición propia de la tienda (visitas, productos vistos, agregados al carrito). Pública:
 * la llama el navegador con sendBeacon. Ignora bots y administradores logueados.
 */
export async function POST(req: NextRequest) {
    const ua = userAgent(req);
    if (ua.isBot) return new NextResponse(null, { status: 204 });

    const token = await getToken({ req });
    if (token?.role === "administrator") return new NextResponse(null, { status: 204 });

    const body = await req.json().catch(() => null);
    const parsed = trackEventSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
    }

    const deviceType = ua.device.type;
    const context: TrackRequestContext = {
        device: deviceType === "mobile" ? "mobile" : deviceType === "tablet" ? "tablet" : "desktop",
        // Geolocalización por IP que agrega Vercel (la IP no se guarda)
        country: decodeHeader(req.headers.get("x-vercel-ip-country")),
        region: decodeHeader(req.headers.get("x-vercel-ip-country-region")),
        city: decodeHeader(req.headers.get("x-vercel-ip-city")),
    };

    try {
        await recordTrackEvent(parsed.data, context);
    } catch (error) {
        // Que falle la medición no tiene que molestar al visitante
        console.error("Error registrando evento de analytics:", error);
    }

    return new NextResponse(null, { status: 204 });
}
