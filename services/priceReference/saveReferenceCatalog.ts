import type { AnyBulkWriteOperation } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import type { CatalogEntry } from "@/lib/priceReference/catalogJson";
import { normalizeSearch } from "@/lib/search/normalize";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";

// Si el catálogo llega con menos de esta fracción de lo que había, no se da de baja nada
// (archivo truncado o error del sitio, no productos discontinuados)
const MIN_COMPLETE_RATIO = 0.5;

/**
 * Guarda una tanda de productos de un catálogo JSON (fuentes `catalog-json`), identificados por
 * su ID en la tienda. `seenAt` es el mismo para todas las tandas de una lectura: al terminar,
 * finishReferenceCatalog da de baja los que no aparecieron.
 */
export async function saveReferenceCatalogBatch(
    sourceKey: string,
    seenAt: Date,
    entries: CatalogEntry[],
): Promise<{ saved: number; priceChanges: number }> {
    await connectDB();
    if (!entries.length) return { saved: 0, priceChanges: 0 };

    const existing = await ReferenceCatalogItemModel.find(
        { source: sourceKey, externalId: { $in: entries.map((e) => e.externalId) } },
        { externalId: 1, price: 1 },
    ).lean<{ externalId: string; price: number | null }[]>();
    const previousPrice = new Map(existing.map((e) => [e.externalId, e.price]));

    let priceChanges = 0;
    const operations: AnyBulkWriteOperation[] = entries.map(({ externalId, url, data }) => {
        const previous = previousPrice.get(externalId);
        const changed = previous != null && previous > 0 && previous !== data.price;
        if (changed) priceChanges++;
        return {
            updateOne: {
                filter: { source: sourceKey, externalId },
                update: {
                    $set: {
                        ...data,
                        url,
                        searchText: normalizeSearch([data.name, data.brand, data.sku, data.gtin].join(" ")),
                        fetchedAt: seenAt,
                        fetchError: null,
                        inSitemap: true,
                        sitemapSeenAt: seenAt,
                        missingSince: null,
                        ...(changed ? { previousPrice: previous, priceChangedAt: seenAt } : {}),
                    },
                },
                upsert: true,
            },
        };
    });
    await ReferenceCatalogItemModel.bulkWrite(operations, { ordered: false });
    return { saved: entries.length, priceChanges };
}

/**
 * Cierra una lectura completa del catálogo: los productos que no vinieron quedan como que ya no
 * están en la tienda. No hace nada si `total` es sospechosamente bajo.
 */
export async function finishReferenceCatalog(
    sourceKey: string,
    seenAt: Date,
    total: number,
): Promise<{ removed: number; skipped: boolean }> {
    await connectDB();
    const current = await ReferenceCatalogItemModel.countDocuments({ source: sourceKey, inSitemap: true });
    if (total < current * MIN_COMPLETE_RATIO) return { removed: 0, skipped: true };

    const removed = await ReferenceCatalogItemModel.updateMany(
        { source: sourceKey, inSitemap: true, sitemapSeenAt: { $ne: seenAt } },
        { $set: { inSitemap: false, inStock: false, missingSince: seenAt } },
    );
    return { removed: removed.modifiedCount, skipped: false };
}
