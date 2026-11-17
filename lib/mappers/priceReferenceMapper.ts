import { getReferenceSource } from "@/lib/priceReference/sources";
import type {
    ProductReferenceLinkDTO,
    ReferenceItemDTO,
    ReferenceMatchMethod,
} from "@/types/shared/priceReference";

type Id = { toString(): string };

export interface ReferenceCatalogItemDoc {
    _id: Id;
    source: string;
    url: string;
    name?: string;
    sku?: string;
    gtin?: string;
    price?: number | null;
    listPrice?: number | null;
    inStock?: boolean;
    fetchedAt?: Date | null;
    previousPrice?: number | null;
    priceChangedAt?: Date | null;
    inSitemap?: boolean;
    missingSince?: Date | null;
}

export interface ProductReferenceLinkDoc {
    _id: Id;
    productId: Id;
    source: string;
    itemId: Id;
    matchMethod?: ReferenceMatchMethod;
    createdAt?: Date;
}

// Campos del ítem que hacen falta para el DTO
export const REFERENCE_ITEM_PROJECTION = {
    source: 1,
    url: 1,
    name: 1,
    sku: 1,
    gtin: 1,
    price: 1,
    listPrice: 1,
    inStock: 1,
    fetchedAt: 1,
    previousPrice: 1,
    priceChangedAt: 1,
    inSitemap: 1,
    missingSince: 1,
} as const;

const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString() : null);

export function mapReferenceItemToDTO(item: ReferenceCatalogItemDoc): ReferenceItemDTO {
    return {
        itemId: item._id.toString(),
        source: item.source,
        sourceLabel: getReferenceSource(item.source)?.label ?? item.source,
        url: item.url,
        name: item.name || item.url,
        sku: item.sku ?? "",
        price: item.price ?? null,
        listPrice: item.listPrice ?? null,
        inStock: Boolean(item.inStock),
        fetchedAt: iso(item.fetchedAt),
        previousPrice: item.previousPrice ?? null,
        priceChangedAt: iso(item.priceChangedAt),
        available: item.inSitemap !== false && !item.missingSince,
    };
}

export function mapProductReferenceLinkToDTO(
    link: ProductReferenceLinkDoc,
    item: ReferenceCatalogItemDoc,
): ProductReferenceLinkDTO {
    return {
        ...mapReferenceItemToDTO(item),
        id: link._id.toString(),
        productId: link.productId.toString(),
        matchMethod: link.matchMethod ?? "manual",
        createdAt: iso(link.createdAt) ?? "",
    };
}
