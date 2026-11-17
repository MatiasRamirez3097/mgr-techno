import type { SitemapEntry } from "@/lib/priceReference/sitemap";
import type { SitemapReferenceSource } from "@/lib/priceReference/sources";
import { ReferenceBlockedError } from "./fetchReferencePage";
import { fetchReferenceProduct, type ReferencePageOutcome } from "./fetchReferenceProduct";
import { fetchReferenceSitemap } from "./fetchReferenceSitemap";
import type { ReferenceQueue } from "./getReferenceQueue";
import type { ReferenceRunSummary } from "./finishReferenceRun";

/**
 * Cómo pedir la cola y guardar resultados. Corre en una PC (las tiendas bloquean las IPs de
 * Vercel), así que normalmente cada operación es un pedido HTTP al sitio; ver tools/price-reference-upload.
 */
export interface ReferencePassStore {
    getQueue(limit: number): Promise<ReferenceQueue>;
    saveSitemap(entries: SitemapEntry[]): Promise<{ urls: number; removed: number }>;
    savePages(outcomes: ReferencePageOutcome[]): Promise<unknown>;
    finish(summary: ReferenceRunSummary): Promise<void>;
}

export interface ReferencePassOptions {
    maxPages: number;
    /** Lecturas en paralelo, con `delayMs` de pausa entre una y otra en cada una */
    concurrency: number;
    delayMs: number;
    /** De a cuántas páginas se mandan los resultados */
    batchSize: number;
    log?: (message: string) => void;
}

export interface ReferencePassResult extends ReferenceRunSummary {
    sitemap?: { urls: number; removed: number };
    queued: number;
    pending: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Una pasada: relee el sitemap si toca y lee las páginas que la cola indica */
export async function runReferencePass(
    source: SitemapReferenceSource,
    store: ReferencePassStore,
    options: ReferencePassOptions,
): Promise<ReferencePassResult> {
    const log = options.log ?? (() => {});
    let fetched = 0;

    try {
        let queue = await store.getQueue(options.maxPages);
        let sitemap: ReferencePassResult["sitemap"];
        if (queue.sitemapDue) {
            const entries = await fetchReferenceSitemap(source);
            sitemap = await store.saveSitemap(entries);
            log(`Sitemap: ${sitemap.urls} productos, ${sitemap.removed} dados de baja`);
            queue = await store.getQueue(options.maxPages);
        }

        const urls = [...queue.urls];
        let batch: ReferencePageOutcome[] = [];
        let blocked: string | null = null;
        // Encadena los guardados para que no se pisen entre lecturas paralelas
        let saving: Promise<unknown> = Promise.resolve();
        const flush = () => {
            if (!batch.length) return;
            const toSave = batch;
            batch = [];
            saving = saving.then(() => store.savePages(toSave));
        };

        const worker = async () => {
            while (urls.length && !blocked) {
                const url = urls.shift()!;
                let outcome: ReferencePageOutcome;
                try {
                    outcome = await fetchReferenceProduct(url);
                } catch (error) {
                    if (error instanceof ReferenceBlockedError) {
                        blocked = error.message;
                        return;
                    }
                    throw error;
                }
                // Recién después del await: `batch` puede haberse reemplazado mientras tanto
                batch.push(outcome);
                fetched++;
                if (batch.length >= options.batchSize) flush();
                await sleep(options.delayMs);
            }
        };
        await Promise.all(Array.from({ length: options.concurrency }, worker));
        flush();
        await saving;

        const unread = urls.length;
        const summary: ReferenceRunSummary = blocked
            ? { status: "error", fetched, message: blocked }
            : { status: queue.pending + unread > 0 ? "partial" : "ok", fetched };
        await store.finish(summary);
        return { ...summary, sitemap, queued: queue.urls.length, pending: queue.pending + unread };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        const summary: ReferenceRunSummary = { status: "error", fetched, message };
        await store.finish(summary).catch(() => {});
        return { ...summary, queued: 0, pending: 0 };
    }
}
