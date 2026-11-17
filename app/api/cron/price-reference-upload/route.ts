import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { REFERENCE_SOURCE_KEYS } from "@/lib/priceReference/sources";
import { priceReferenceUploadSchema } from "@/lib/validators/priceReferenceUploadSchema";
import { finishReferenceRun } from "@/services/priceReference/finishReferenceRun";
import { autoLinkReferencesByCode } from "@/services/priceReference/links/autoLinkReferencesByCode";
import { getReferenceQueue } from "@/services/priceReference/getReferenceQueue";
import {
    finishReferenceCatalog,
    saveReferenceCatalogBatch,
} from "@/services/priceReference/saveReferenceCatalog";
import { saveReferencePages } from "@/services/priceReference/saveReferencePages";
import { saveReferenceSitemap } from "@/services/priceReference/saveReferenceSitemap";

// Las tiendas de referencia bloquean las IPs de Vercel, así que las páginas se leen desde una PC
// (tools/price-reference-upload): GET le dice qué leer y POST recibe lo leído. Está bajo /api/cron
// para quedar fuera del matcher de proxy.ts; se autentica con `Authorization: Bearer <PRICE_REFERENCE_TOKEN>`.
export const maxDuration = 60;

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_QUEUE = 1000;

function isAuthorized(req: NextRequest): boolean {
    const token = process.env.PRICE_REFERENCE_TOKEN;
    if (!token) return false;
    const expected = Buffer.from(`Bearer ${token}`);
    const received = Buffer.from(req.headers.get("authorization") || "");
    return expected.length === received.length && timingSafeEqual(expected, received);
}

const unauthorized = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) return unauthorized();

    const source = req.nextUrl.searchParams.get("source") || "";
    if (!REFERENCE_SOURCE_KEYS.includes(source)) {
        return NextResponse.json({ error: "Fuente desconocida" }, { status: 400 });
    }
    const limit = Math.min(
        Math.max(Number(req.nextUrl.searchParams.get("limit")) || 300, 1),
        MAX_QUEUE,
    );

    return NextResponse.json(await getReferenceQueue(source, limit));
}

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) return unauthorized();

    if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "El envío supera el tamaño máximo" }, { status: 413 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "El cuerpo debe ser JSON" }, { status: 400 });
    }

    const parsed = priceReferenceUploadSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos inválidos", issues: parsed.error.issues.slice(0, 5) },
            { status: 400 },
        );
    }

    const input = parsed.data;
    switch (input.action) {
        case "sitemap":
            return NextResponse.json(await saveReferenceSitemap(input.source, input.entries));
        case "pages":
            return NextResponse.json(await saveReferencePages(input.source, input.outcomes));
        case "catalog":
            return NextResponse.json(
                await saveReferenceCatalogBatch(input.source, input.seenAt, input.entries),
            );
        case "catalog-finish":
            return NextResponse.json(
                await finishReferenceCatalog(input.source, input.seenAt, input.total),
            );
        case "finish": {
            await finishReferenceRun(input.source, input.summary);
            // Con las páginas nuevas puede haber productos para vincular por part number / EAN
            const autoLink = await autoLinkReferencesByCode();
            return NextResponse.json({ ok: true, autoLink });
        }
    }
}
