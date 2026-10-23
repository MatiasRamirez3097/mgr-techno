// Descarga la lista de AIR desde su intranet y la sube al sitio. La intranet no acepta
// conexiones desde Vercel, así que esto corre en una PC con una tarea programada (ver README.md).
// Uso: npx tsx tools/air-upload/upload.ts  (desde la raíz del repo)
// Variables (en .env.local): AIR_USER, AIR_PASSWORD, AIR_IMPORT_TOKEN y, opcional, AIR_IMPORT_URL.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const DEFAULT_IMPORT_URL = "https://mgrtechno.com.ar/api/cron/air-import";

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

async function main() {
    const token = process.env.AIR_IMPORT_TOKEN;
    if (!token) throw new Error("Falta la variable AIR_IMPORT_TOKEN");
    const importUrl = process.env.AIR_IMPORT_URL || DEFAULT_IMPORT_URL;

    const { downloadAirFiles } = await import("@/services/distributors/air/fetchAirCatalog");
    const files = await downloadAirFiles();
    log(`Lista descargada: ${files.csv.length} bytes${files.rubros ? ", con rubros" : ", sin rubros"}`);

    const res = await fetch(importUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            csv: Buffer.from(files.csv).toString("base64"),
            rubros: files.rubros ? Buffer.from(files.rubros).toString("base64") : null,
        }),
        signal: AbortSignal.timeout(120000),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`El sitio respondió HTTP ${res.status}: ${result.message || result.error || "sin detalle"}`);
    }
    log(`Importada: ${result.items} artículos, ${result.priceChanges} con cambio de precio`);
}

main().catch((error) => {
    log("ERROR:", error instanceof Error ? error.message : error);
    process.exit(1);
});
