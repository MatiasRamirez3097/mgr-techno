import type { DistributorKey, DistributorLinkMatchMethod, ProductDistributorLinkDTO } from "@/types/shared/distributorLink";

type IdLike = { toString(): string } | null | undefined;

// Forma del documento en Mongo (models/ProductDistributorLink.ts)
export interface ProductDistributorLinkDoc {
    _id: IdLike;
    productId: IdLike;
    distributor: DistributorKey;
    distributorProductId: string;
    distributorSku?: string;
    name: string;
    link?: string | null;
    image?: string | null;
    matchMethod?: DistributorLinkMatchMethod;
    lastPrice?: number | null;
    lastStock?: number | null;
    lastStockLabel?: string | null;
    lastCheckedAt?: Date | null;
    createdAt?: Date;
}

export function mapProductDistributorLinkToDTO(doc: ProductDistributorLinkDoc): ProductDistributorLinkDTO {
    return {
        id: doc._id?.toString() || "",
        productId: doc.productId?.toString() || "",
        distributor: doc.distributor,
        distributorProductId: doc.distributorProductId,
        distributorSku: doc.distributorSku || "",
        name: doc.name,
        link: doc.link || null,
        image: doc.image || null,
        matchMethod: doc.matchMethod || "manual",
        lastPrice: doc.lastPrice ?? null,
        lastStock: doc.lastStock ?? null,
        lastStockLabel: doc.lastStockLabel || null,
        lastCheckedAt: doc.lastCheckedAt ? new Date(doc.lastCheckedAt).toISOString() : null,
        available: true,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    };
}
