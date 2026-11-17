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

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

async function main() {
    const token = process.env.PRICE_REFERENCE_TOKEN;
    if (!token) throw new Error("Falta la variable PRICE_REFERENCE_TOKEN");
    const endpoint = process.env.PRICE_REFERENCE_URL || DEFAULT_URL;

    const { REFERENCE_SOURCES } = await import("@/lib/priceReference/sources");
    const { runReferencePass } = await import("@/services/priceReference/runReferencePass");

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
            throw new Error(
                `${new URL(endpoint).host} respondió HTTP ${res.status}: ${body.error || "sin detalle"}${hint}`,
            );
        }
        return body;
    };
    const post = (payload: object) => call({ method: "POST", body: JSON.stringify(payload) });

    const all = process.argv.includes("--all");
    let failed = false;
    for (const source of REFERENCE_SOURCES) {
        for (let pass = 1; pass <= (all ? MAX_PASSES : 1); pass++) {
            const result = await runReferencePass(
                source,
                {
                    getQueue: (limit) =>
                        call({ method: "GET", query: `?source=${source.key}&limit=${limit}` }),
                    saveSitemap: (entries) => post({ action: "sitemap", source: source.key, entries }),
                    savePages: (outcomes) => post({ action: "pages", source: source.key, outcomes }),
                    finish: async (summary) => {
                        const res = await post({ action: "finish", source: source.key, summary });
                        if (res.autoLink?.linked) {
                            log(`[${source.key}] Vinculados por part number / EAN: ${res.autoLink.linked}`);
                        }
                    },
                },
                { ...OPTIONS, log: (message) => log(`[${source.key}]`, message) },
            );

            log(
                `[${source.key}] ${result.status}: ${result.fetched} páginas leídas de ${result.queued}, ` +
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
