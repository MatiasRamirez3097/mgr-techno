import type { AnyBulkWriteOperation } from "mongoose";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import { parseSitemap, type SitemapEntry } from "@/lib/priceReference/sitemap";
import type { ReferenceSource } from "@/lib/priceReference/sources";
import { fetchReferencePage } from "./fetchReferencePage";

export interface SitemapRefreshResult {
    urls: number;
    removed: number;
}

/**
 * Lee el índice de sitemaps de la tienda y los sitemaps de productos, y actualiza la lista
 * de URLs de `reference_catalog_items`. Las que dejaron de aparecer quedan con `inSitemap: false`.
 * Si algún sitemap falla no se marca nada como faltante (la lista estaría incompleta).
 */
export async function refreshReferenceSitemap(
    source: ReferenceSource,
): Promise<SitemapRefreshResult> {
    const startedAt = new Date();

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

    const operations: AnyBulkWriteOperation[] = [...entries.values()].map((entry) => ({
        updateOne: {
            filter: { source: source.key, url: entry.loc },
            update: {
                $set: {
                    lastmod: entry.lastmod,
                    inSitemap: true,
                    sitemapSeenAt: startedAt,
                },
                // missingSince se limpia recién cuando la página se lee bien
            },
            upsert: true,
        },
    }));
    if (operations.length) {
        await ReferenceCatalogItemModel.bulkWrite(operations, { ordered: false });
    }

    // Las que no se tocaron en esta lectura ya no están en el sitemap
    const removed = await ReferenceCatalogItemModel.updateMany(
        { source: source.key, inSitemap: true, sitemapSeenAt: { $ne: startedAt } },
        { $set: { inSitemap: false, inStock: false, missingSince: startedAt } },
    );

    return { urls: entries.size, removed: removed.modifiedCount };
}
