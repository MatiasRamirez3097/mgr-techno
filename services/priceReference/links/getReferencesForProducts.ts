import { Types } from "mongoose";
import {
    mapReferenceItemToDTO,
    REFERENCE_ITEM_PROJECTION,
    type ReferenceCatalogItemDoc,
} from "@/lib/mappers/priceReferenceMapper";
import { ProductReferenceLinkModel } from "@/models/ProductReferenceLink";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import type { PriceReviewReference } from "@/types/shared/priceReview";

// Un cambio de precio se marca en la revisión durante esta ventana
const RECENT_CHANGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Referencias de precio vinculadas a cada producto (productId → de la más barata a la más cara) */
export async function getReferencesForProducts(
    productIds: Types.ObjectId[],
): Promise<Map<string, PriceReviewReference[]>> {
    const result = new Map<string, PriceReviewReference[]>();
    if (!productIds.length) return result;

    const links = await ProductReferenceLinkModel.find(
        { productId: { $in: productIds }, dismissed: { $ne: true } },
        { productId: 1, itemId: 1 },
    ).lean<{ productId: Types.ObjectId; itemId: Types.ObjectId }[]>();
    if (!links.length) return result;

    const items = await ReferenceCatalogItemModel.find(
        { _id: { $in: links.map((l) => l.itemId) } },
        REFERENCE_ITEM_PROJECTION,
    ).lean<ReferenceCatalogItemDoc[]>();
    const byId = new Map(items.map((i) => [i._id.toString(), mapReferenceItemToDTO(i)]));

    for (const link of links) {
        const item = byId.get(link.itemId.toString());
        if (!item) continue;
        const productId = link.productId.toString();
        const recent =
            item.previousPrice &&
            item.price &&
            item.priceChangedAt &&
            Date.now() - new Date(item.priceChangedAt).getTime() < RECENT_CHANGE_MS;
        result.set(productId, [
            ...(result.get(productId) ?? []),
            {
                source: item.source,
                sourceLabel: item.sourceLabel,
                name: item.name,
                url: item.url,
                price: item.price,
                listPrice: item.listPrice,
                inStock: item.inStock,
                available: item.available,
                fetchedAt: item.fetchedAt,
                recentChange: recent ? (item.price! - item.previousPrice!) / item.previousPrice! : null,
            },
        ]);
    }
    for (const list of result.values()) {
        list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    }
    return result;
}
