import { connectDB } from "@/lib/mongodb";
import { referenceStateId } from "@/lib/priceReference/sources";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";

const HOUR = 60 * 60 * 1000;
// Frecuencias acordadas: todo el catálogo una vez por día, lo vinculado cada pocas horas
export const SITEMAP_EVERY_MS = 24 * HOUR;
export const FULL_REFRESH_MS = 24 * HOUR;
export const LINKED_REFRESH_MS = 4 * HOUR;

export interface ReferenceQueue {
    /** Hay que releer el sitemap antes de seguir */
    sitemapDue: boolean;
    urls: string[];
    /** Páginas nunca leídas o con más de 24 h, además de las que van en `urls` */
    pending: number;
}

/**
 * Páginas a leer en la próxima pasada, por prioridad: nunca leídas, modificadas según el
 * sitemap, vinculadas con más de 4 h y el resto con más de 24 h.
 */
export async function getReferenceQueue(sourceKey: string, limit: number): Promise<ReferenceQueue> {
    await connectDB();
    const now = Date.now();

    const state = await DistributorSyncStateModel.findById(referenceStateId(sourceKey)).lean<{
        lastSitemapAt?: Date | null;
    }>();
    const sitemapDue =
        !state?.lastSitemapAt || now - new Date(state.lastSitemapAt).getTime() >= SITEMAP_EVERY_MS;

    const base = { source: sourceKey, inSitemap: true };
    const queries = [
        { ...base, fetchedAt: null },
        { ...base, fetchedAt: { $ne: null }, $expr: { $gt: ["$lastmod", "$fetchedAt"] } },
        { ...base, linked: true, fetchedAt: { $lt: new Date(now - LINKED_REFRESH_MS) } },
        { ...base, fetchedAt: { $lt: new Date(now - FULL_REFRESH_MS) } },
    ];

    const urls = new Set<string>();
    for (const query of queries) {
        if (urls.size >= limit) break;
        const items = await ReferenceCatalogItemModel.find(query, { url: 1 })
            .sort({ fetchedAt: 1 })
            .limit(limit)
            .lean<{ url: string }[]>();
        for (const item of items) {
            if (urls.size >= limit) break;
            urls.add(item.url);
        }
    }

    const due = await ReferenceCatalogItemModel.countDocuments({
        ...base,
        $or: [{ fetchedAt: null }, { fetchedAt: { $lt: new Date(now - FULL_REFRESH_MS) } }],
    });

    return { sitemapDue, urls: [...urls], pending: Math.max(0, due - urls.size) };
}
