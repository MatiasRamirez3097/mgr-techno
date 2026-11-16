import { connectDB } from "@/lib/mongodb";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { DistributorSyncStateModel } from "@/models/DistributorSyncState";
import { buildLinkSnapshotUpdate } from "@/lib/distributors/productLinks";
import { mapNewBytesProduct } from "@/lib/distributors/newbytesMapper";
import { acquireSyncLock, releaseSyncLock } from "@/services/distributors/syncLock";
import { fetchElitProductsByIds } from "@/services/distributors/elit/fetchElitProductsByIds";
import { requestNewBytesProducts } from "@/services/distributors/newbytes/requestNewBytesProducts";
import type { NormalizedProduct } from "@/types/shared/distributor";

export const LINK_PRICES_STATE_ID = "link-prices";
const LOCK_MS = 10 * 60 * 1000;

type RemoteDistributor = "elit" | "newbytes";

export interface LinkPriceChange {
    productId: string;
    distributor: RemoteDistributor;
    name: string;
    previous: number;
    current: number;
    change: number;
}

export interface RefreshRemoteLinkPricesResult {
    skipped?: boolean;
    distributors: Record<
        RemoteDistributor,
        { links: number; updated: number; missing: number; requests: number; errors: string[] }
    >;
    priceChanges: LinkPriceChange[];
}

interface LinkLean {
    _id: { toString(): string };
    productId: { toString(): string };
    distributor: RemoteDistributor;
    distributorProductId: string;
    lastPrice?: number | null;
    missingSince?: Date | null;
}

const emptyStats = () => ({ links: 0, updated: 0, missing: 0, requests: 0, errors: [] as string[] });

/**
 * Actualiza el costo y stock de los vínculos con Elit y NewBytes (que no tienen copia local):
 * NewBytes en un solo pedido del catálogo completo y Elit por ID o recorriendo su catálogo.
 * Registra los cambios de costo y marca los productos que el distribuidor ya no tiene.
 */
export async function refreshRemoteLinkPrices(): Promise<RefreshRemoteLinkPricesResult> {
    await connectDB();

    const result: RefreshRemoteLinkPricesResult = {
        distributors: { elit: emptyStats(), newbytes: emptyStats() },
        priceChanges: [],
    };

    if (!(await acquireSyncLock(LINK_PRICES_STATE_ID, LOCK_MS))) {
        return { ...result, skipped: true };
    }

    try {
        const links = await ProductDistributorLinkModel.find(
            { distributor: { $in: ["elit", "newbytes"] } },
            { productId: 1, distributor: 1, distributorProductId: 1, lastPrice: 1, missingSince: 1 },
        ).lean<LinkLean[]>();

        const byDistributor: Record<RemoteDistributor, LinkLean[]> = {
            elit: links.filter((l) => l.distributor === "elit"),
            newbytes: links.filter((l) => l.distributor === "newbytes"),
        };

        const sources = await Promise.all([
            loadElit(byDistributor.elit.map((l) => l.distributorProductId)),
            loadNewBytes(byDistributor.newbytes.length > 0),
        ]);
        const sourceFor = { elit: sources[0], newbytes: sources[1] };

        const now = new Date();
        const ops: Parameters<typeof ProductDistributorLinkModel.bulkWrite>[0] = [];

        for (const distributor of ["elit", "newbytes"] as const) {
            const stats = result.distributors[distributor];
            const source = sourceFor[distributor];
            stats.links = byDistributor[distributor].length;
            stats.requests = source.requests;
            stats.errors = source.errors;

            for (const link of byDistributor[distributor]) {
                const item = source.found.get(link.distributorProductId);
                // Sin datos y sin confirmar que falta (ej: error de la API): no se toca
                if (!item && !source.complete && !source.missing.has(link.distributorProductId)) continue;

                const { set, priceChange } = buildLinkSnapshotUpdate(link, item ?? null, now);
                ops.push({ updateOne: { filter: { _id: link._id }, update: { $set: set } } });
                if (item) stats.updated++;
                else stats.missing++;
                if (priceChange && item) {
                    result.priceChanges.push({
                        productId: link.productId.toString(),
                        distributor,
                        name: item.name,
                        ...priceChange,
                    });
                }
            }
        }

        if (ops.length > 0) await ProductDistributorLinkModel.bulkWrite(ops, { ordered: false });

        const errors = [...result.distributors.elit.errors, ...result.distributors.newbytes.errors];
        await DistributorSyncStateModel.updateOne(
            { _id: LINK_PRICES_STATE_ID },
            {
                $set: {
                    lastSyncFinishedAt: now,
                    lastSyncStatus: errors.length === 0 ? "ok" : ops.length > 0 ? "partial" : "error",
                    lastSyncError: errors.length > 0 ? errors.slice(0, 5).join(" | ").slice(0, 1000) : null,
                    lastSyncItems: ops.length,
                    lastSyncRequests: result.distributors.elit.requests + result.distributors.newbytes.requests,
                    ...(errors.length === 0 || ops.length > 0 ? { lastSuccessfulSyncAt: now } : {}),
                },
            },
        );

        return result;
    } finally {
        await releaseSyncLock(LINK_PRICES_STATE_ID);
    }
}

interface Source {
    found: Map<string, NormalizedProduct>;
    // IDs confirmados como faltantes
    missing: Set<string>;
    // true = es el catálogo completo: todo lo que no está en `found` falta
    complete: boolean;
    requests: number;
    errors: string[];
}

const emptySource = (): Source => ({ found: new Map(), missing: new Set(), complete: false, requests: 0, errors: [] });

// NewBytes tiene ~3.000 productos: una lista mucho más corta es un error de la API,
// y no debe marcar como faltantes los productos vinculados
export const NEWBYTES_MIN_CATALOG_SIZE = 500;

async function loadElit(ids: string[]): Promise<Source> {
    if (ids.length === 0) return emptySource();
    return { ...(await fetchElitProductsByIds(ids)), complete: false };
}

async function loadNewBytes(needed: boolean): Promise<Source> {
    const source = emptySource();
    if (!needed) return source;
    try {
        source.requests = 1;
        const products = await requestNewBytesProducts();
        for (const raw of products) {
            const product = mapNewBytesProduct(raw);
            source.found.set(String(product.id), product);
        }
        if (products.length >= NEWBYTES_MIN_CATALOG_SIZE) {
            source.complete = true;
        } else {
            source.errors.push(`NewBytes devolvió sólo ${products.length} productos: no se marcan faltantes`);
        }
    } catch (err) {
        source.errors.push(err instanceof Error ? err.message : String(err));
    }
    return source;
}
