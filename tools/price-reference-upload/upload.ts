// Lee los catálogos de las tiendas de referencia de precio y sube lo leído al sitio. Las tiendas
// bloquean las IPs de Vercel, así que esto corre en una PC con una tarea programada (ver README.md).
// Uso: npx tsx tools/price-reference-upload/upload.ts  (desde la raíz del repo)
//      Con --all encadena pasadas hasta vaciar la cola (para la carga inicial).
// Variables (en .env.local): PRICE_REFERENCE_TOKEN y, opcional, PRICE_REFERENCE_URL.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const DEFAULT_URL = "https://mgrtechno.com.ar/api/cron/price-reference-upload";

// Por pasada (la tarea corre cada hora): 2 lecturas en paralelo con pausa, unas 400 páginas
const OPTIONS = { maxPages: 400, concurrency: 2, delayMs: 700, batchSize: 50 };
// Con --all: tope de pasadas seguidas (unas 8.000 páginas), por si la cola no se vacía
const MAX_PASSES = 20;
// Catálogos JSON: productos por envío al sitio
const CATALOG_BATCH_SIZE = 500;

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

async function main() {
    const token = process.env.PRICE_REFERENCE_TOKEN;
    if (!token) throw new Error("Falta la variable PRICE_REFERENCE_TOKEN");
    const endpoint = process.env.PRICE_REFERENCE_URL || DEFAULT_URL;

    const { REFERENCE_SOURCES } = await import("@/lib/priceReference/sources");
    const { runReferencePass } = await import("@/services/priceReference/runReferencePass");
    const { runCatalogSync } = await import("@/services/priceReference/runCatalogSync");

    const call = async (init: RequestInit & { query?: string }) => {
        const res = await fetch(`${endpoint}${init.query ?? ""}`, {
            ...init,
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            signal: AbortSignal.timeout(90_000),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            const hint =
                res.status === 429 || res.status === 403
                    ? " (¿falta la regla Bypass del firewall de Vercel para esta ruta?)"
                    : "";
            // Con datos rechazados, el primer problema (campo y motivo) ayuda a saber qué pasó
            const issue = Array.isArray(body.issues) && body.issues[0];
            const detail = issue ? ` (${(issue.path || []).join(".") || "cuerpo"}: ${issue.message})` : "";
            throw new Error(
                `${new URL(endpoint).host} respondió HTTP ${res.status}: ${body.error || "sin detalle"}${detail}${hint}`,
            );
        }
        return body;
    };
    const post = (payload: object) => call({ method: "POST", body: JSON.stringify(payload) });

    const all = process.argv.includes("--all");
    const finish = (sourceKey: string) => async (summary: object) => {
        const res = await post({ action: "finish", source: sourceKey, summary });
        if (res.autoLink?.linked) {
            log(`[${sourceKey}] Vinculados por part number / EAN: ${res.autoLink.linked}`);
        }
    };

    let failed = false;
    for (const source of REFERENCE_SOURCES) {
        const prefix = `[${source.key}]`;

        // Catálogo en un solo archivo: se lee completo en cada ejecución
        if (source.type === "catalog-json") {
            const result = await runCatalogSync(
                source,
                {
                    saveBatch: (seenAt, entries) =>
                        post({ action: "catalog", source: source.key, seenAt, entries }),
                    finishCatalog: (seenAt, total) =>
                        post({ action: "catalog-finish", source: source.key, seenAt, total }),
                    finish: finish(source.key),
                },
                { batchSize: CATALOG_BATCH_SIZE, log: (message) => log(prefix, message) },
            );
            log(
                `${prefix} ${result.status}: ${result.fetched} productos guardados, ` +
                    `${result.removed} dados de baja${result.message ? ` — ${result.message}` : ""}`,
            );
            if (result.status === "error") failed = true;
            continue;
        }

        // Sitemap + una página por producto: por tandas, según la cola del sitio
        for (let pass = 1; pass <= (all ? MAX_PASSES : 1); pass++) {
            const result = await runReferencePass(
                source,
                {
                    getQueue: (limit) =>
                        call({ method: "GET", query: `?source=${source.key}&limit=${limit}` }),
                    saveSitemap: (entries) => post({ action: "sitemap", source: source.key, entries }),
                    savePages: (outcomes) => post({ action: "pages", source: source.key, outcomes }),
                    finish: finish(source.key),
                },
                { ...OPTIONS, log: (message) => log(prefix, message) },
            );

            log(
                `${prefix} ${result.status}: ${result.fetched} páginas leídas de ${result.queued}, ` +
                    `${result.pending} pendientes${result.message ? ` — ${result.message}` : ""}`,
            );
            if (result.status === "error") failed = true;
            // Sigue sólo si quedan pendientes y esta pasada avanzó
            if (result.status !== "partial" || result.fetched === 0) break;
        }
    }
    // process.exitCode en vez de process.exit: en Windows cortar con conexiones abiertas
    // dispara "Assertion failed ... async.c"
    if (failed) process.exitCode = 1;
}

main().catch((error) => {
    log("ERROR:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
