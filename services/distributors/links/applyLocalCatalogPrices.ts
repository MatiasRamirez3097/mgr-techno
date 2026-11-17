import type { ProductDistributorLinkDTO } from "@/types/shared/distributorLink";
import { emptyLocalIds, getLocalCatalogItemsByIds, LOCAL_DISTRIBUTORS, type LocalDistributor } from "./localCatalogItems";

const isLocal = (d: string): d is LocalDistributor => (LOCAL_DISTRIBUTORS as readonly string[]).includes(d);

/**
 * Completa los vínculos de Invid, AIR y PCMODD con el costo y stock vigentes de sus catálogos
 * locales. Los de Elit y NewBytes quedan con el último valor guardado.
 */
export async function applyLocalCatalogPrices(
    links: ProductDistributorLinkDTO[],
): Promise<ProductDistributorLinkDTO[]> {
    const ids = emptyLocalIds();
    for (const link of links) {
        if (isLocal(link.distributor)) ids[link.distributor].push(link.distributorProductId);
    }
    if (!LOCAL_DISTRIBUTORS.some((d) => ids[d].length > 0)) return links;

    const items = await getLocalCatalogItemsByIds(ids);
    const byKey = new Map(items.map((i) => [`${i.distributor}:${i.distributorProductId}`, i]));
    const now = new Date().toISOString();

    return links.map((link) => {
        if (!isLocal(link.distributor)) return link;
        const item = byKey.get(`${link.distributor}:${link.distributorProductId}`);
        if (!item) return { ...link, available: false };
        return {
            ...link,
            lastPrice: item.price,
            lastStock: item.stock,
            lastStockLabel: item.stockLabel ?? null,
            lastCheckedAt: now,
            available: item.available,
        };
    });
}
