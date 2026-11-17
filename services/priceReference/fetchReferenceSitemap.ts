import { parseSitemap, type SitemapEntry } from "@/lib/priceReference/sitemap";
import type { SitemapReferenceSource } from "@/lib/priceReference/sources";
import { fetchReferencePage } from "./fetchReferencePage";

/**
 * Lee el índice de sitemaps de la tienda y todos sus sitemaps de productos.
 * Si alguno falla, lanza error: con la lista incompleta no se puede saber qué productos salieron.
 */
export async function fetchReferenceSitemap(source: SitemapReferenceSource): Promise<SitemapEntry[]> {
    const index = await fetchReferencePage(source.sitemapUrl);
    if (index.status !== "ok") {
        throw new Error(
            `No se pudo leer el índice de sitemaps (${index.status === "error" ? index.message : "404"})`,
        );
    }
    const productSitemaps = parseSitemap(index.body).filter((e) =>
        source.productSitemapPattern.test(e.loc),
    );
    if (!productSitemaps.length) {
        throw new Error("El índice de sitemaps no tiene sitemaps de productos");
    }

    const entries = new Map<string, SitemapEntry>();
    for (const sitemap of productSitemaps) {
        const page = await fetchReferencePage(sitemap.loc);
        if (page.status !== "ok") {
            throw new Error(
                `No se pudo leer ${sitemap.loc} (${page.status === "error" ? page.message : "404"})`,
            );
        }
        for (const entry of parseSitemap(page.body)) entries.set(entry.loc, entry);
    }
    return [...entries.values()];
}
