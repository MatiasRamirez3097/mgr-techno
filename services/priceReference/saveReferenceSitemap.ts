import type { AnyBulkWriteOperation } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import type { SitemapEntry } from "@/lib/priceReference/sitemap";
import { referenceStateId } from "@/lib/priceReference/sources";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";

export interface SitemapSaveResult {
    urls: number;
    removed: number;
}

/**
 * Guarda la lista completa de URLs de productos de una tienda. Las que dejaron de aparecer
 * quedan con `inSitemap: false` y no se vuelven a leer.
 */
export async function saveReferenceSitemap(
    sourceKey: string,
    entries: SitemapEntry[],
): Promise<SitemapSaveResult> {
    await connectDB();
    const seenAt = new Date();

    const operations: AnyBulkWriteOperation[] = entries.map((entry) => ({
        updateOne: {
            filter: { source: sourceKey, url: entry.loc },
            // missingSince se limpia recién cuando la página se lee bien
            update: { $set: { lastmod: entry.lastmod, inSitemap: true, sitemapSeenAt: seenAt } },
            upsert: true,
        },
    }));
    if (operations.length) {
        await ReferenceCatalogItemModel.bulkWrite(operations, { ordered: false });
    }

    const removed = await ReferenceCatalogItemModel.updateMany(
        { source: sourceKey, inSitemap: true, sitemapSeenAt: { $ne: seenAt } },
        { $set: { inSitemap: false, inStock: false, missingSince: seenAt } },
    );

    await DistributorSyncStateModel.updateOne(
        { _id: referenceStateId(sourceKey) },
        { $set: { lastSitemapAt: seenAt } },
        { upsert: true },
    );

    return { urls: entries.length, removed: removed.modifiedCount };
}
