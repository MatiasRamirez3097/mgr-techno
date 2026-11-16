import type { ProductDistributorLinkDTO } from "@/types/shared/distributorLink";
import { getLocalCatalogItemsByIds } from "./localCatalogItems";

/**
 * Completa los vínculos de Invid y AIR con el costo y stock vigentes de sus catálogos
 * locales. Los de Elit y NewBytes quedan con el último valor guardado.
 */
export async function applyLocalCatalogPrices(
    links: ProductDistributorLinkDTO[],
): Promise<ProductDistributorLinkDTO[]> {
    const ids = { invid: [] as string[], air: [] as string[] };
    for (const link of links) {
        if (link.distributor === "invid" || link.distributor === "air") {
            ids[link.distributor].push(link.distributorProductId);
        }
    }
    if (ids.invid.length === 0 && ids.air.length === 0) return links;

    const items = await getLocalCatalogItemsByIds(ids);
    const byKey = new Map(items.map((i) => [`${i.distributor}:${i.distributorProductId}`, i]));
    const now = new Date().toISOString();

    return links.map((link) => {
        if (link.distributor !== "invid" && link.distributor !== "air") return link;
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
