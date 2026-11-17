import { parseCatalog, type CatalogEntry } from "@/lib/priceReference/catalogJson";
import type { CatalogReferenceSource } from "@/lib/priceReference/sources";
import { fetchReferencePage } from "./fetchReferencePage";
import type { ReferenceRunSummary } from "./finishReferenceRun";

/**
 * Cómo guardar lo leído. Corre en una PC, igual que las fuentes por sitemap, así que cada
 * operación suele ser un pedido HTTP al sitio (ver tools/price-reference-upload).
 */
export interface ReferenceCatalogStore {
    saveBatch(seenAt: Date, entries: CatalogEntry[]): Promise<unknown>;
    finishCatalog(seenAt: Date, total: number): Promise<{ removed: number; skipped: boolean }>;
    finish(summary: ReferenceRunSummary): Promise<void>;
}

export interface CatalogSyncResult extends ReferenceRunSummary {
    removed: number;
}

// El archivo trae todo el catálogo (varios MB)
const CATALOG_TIMEOUT_MS = 120_000;

/** Descarga el catálogo completo de una fuente `catalog-json` y lo sube en tandas */
export async function runCatalogSync(
    source: CatalogReferenceSource,
    store: ReferenceCatalogStore,
    { batchSize, log = () => {} }: { batchSize: number; log?: (message: string) => void },
): Promise<CatalogSyncResult> {
    let saved = 0;
    try {
        const page = await fetchReferencePage(source.catalogUrl, { timeoutMs: CATALOG_TIMEOUT_MS });
        if (page.status !== "ok") {
            throw new Error(
                `No se pudo leer el catálogo (${page.status === "error" ? page.message : "404"})`,
            );
        }
        let json: unknown;
        try {
            json = JSON.parse(page.body);
        } catch {
            throw new Error("El catálogo no es un JSON válido");
        }
        const entries = parseCatalog(json, source);
        if (!entries.length) throw new Error("El catálogo no trae productos válidos");
        log(`Catálogo: ${entries.length} productos`);

        const seenAt = new Date();
        for (let i = 0; i < entries.length; i += batchSize) {
            await store.saveBatch(seenAt, entries.slice(i, i + batchSize));
            saved += Math.min(batchSize, entries.length - i);
        }
        const { removed, skipped } = await store.finishCatalog(seenAt, entries.length);
        if (skipped) log("El catálogo vino con muchos menos productos que antes: no se dio de baja ninguno");

        const summary: ReferenceRunSummary = { status: "ok", fetched: saved };
        await store.finish(summary);
        return { ...summary, removed };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        const summary: ReferenceRunSummary = { status: "error", fetched: saved, message };
        await store.finish(summary).catch(() => {});
        return { ...summary, removed: 0 };
    }
}
