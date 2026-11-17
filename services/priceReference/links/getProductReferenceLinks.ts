import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
    mapProductReferenceLinkToDTO,
    REFERENCE_ITEM_PROJECTION,
    type ProductReferenceLinkDoc,
    type ReferenceCatalogItemDoc,
} from "@/lib/mappers/priceReferenceMapper";
import { ProductReferenceLinkModel } from "@/models/ProductReferenceLink";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import type { ProductReferenceLinkDTO } from "@/types/shared/priceReference";

/** Vínculos de un producto con las tiendas de referencia, con los precios vigentes de cada una */
export async function getProductReferenceLinks(productId: string): Promise<ProductReferenceLinkDTO[]> {
    if (!isValidObjectId(productId)) return [];
    await connectDB();

    const links = await ProductReferenceLinkModel.find({ productId, dismissed: { $ne: true } })
        .sort({ source: 1 })
        .lean<ProductReferenceLinkDoc[]>();
    if (!links.length) return [];

    const items = await ReferenceCatalogItemModel.find(
        { _id: { $in: links.map((l) => l.itemId) } },
        REFERENCE_ITEM_PROJECTION,
    ).lean<ReferenceCatalogItemDoc[]>();
    const byId = new Map(items.map((i) => [i._id.toString(), i]));

    return links.flatMap((link) => {
        const item = byId.get(link.itemId.toString());
        return item ? [mapProductReferenceLinkToDTO(link, item)] : [];
    });
}
