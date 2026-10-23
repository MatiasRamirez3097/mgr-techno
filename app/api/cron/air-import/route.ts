import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { importAirCatalog } from "@/services/distributors/air/importAirCatalog";

// Recibe la lista de AIR que sube la tarea programada de la PC (tools/air-upload): la intranet
// de AIR no acepta conexiones desde Vercel. Está bajo /api/cron para quedar fuera del matcher
// de proxy.ts; se autentica con `Authorization: Bearer <AIR_IMPORT_TOKEN>`.
export const maxDuration = 60;

// La lista pesa unos 360 KB (en base64, ~480 KB)
const MAX_BODY_BYTES = 4 * 1024 * 1024;

function isAuthorized(req: NextRequest): boolean {
    const token = process.env.AIR_IMPORT_TOKEN;
    if (!token) return false;
    const expected = Buffer.from(`Bearer ${token}`);
    const received = Buffer.from(req.headers.get("authorization") || "");
    return expected.length === received.length && timingSafeEqual(expected, received);
}

const fromBase64 = (value: unknown) =>
    typeof value === "string" && value ? new Uint8Array(Buffer.from(value, "base64")) : null;

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "La lista supera el tamaño máximo" }, { status: 413 });
    }

    let body: { csv?: unknown; rubros?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "El cuerpo debe ser JSON" }, { status: 400 });
    }

    const csv = fromBase64(body.csv);
    if (!csv) {
        return NextResponse.json({ error: "Falta la lista (csv en base64)" }, { status: 400 });
    }

    const result = await importAirCatalog({ csv, rubros: fromBase64(body.rubros) });
    const httpStatus =
        result.status === "error" ? 422 : result.status === "skipped" ? 409 : 200;

    return NextResponse.json(result, { status: httpStatus });
}
