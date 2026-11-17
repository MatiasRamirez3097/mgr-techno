import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import { ProductReferenceLinkModel } from "@/models/ProductReferenceLink";

/**
 * Marca `linked` en los ítems indicados según tengan o no algún vínculo: los vinculados se
 * actualizan más seguido (cada 4 h en vez de cada 24 h).
 */
export async function syncLinkedFlags(itemIds: unknown[]): Promise<void> {
    if (!itemIds.length) return;
    const linked = await ProductReferenceLinkModel.distinct("itemId", {
        itemId: { $in: itemIds },
        dismissed: { $ne: true },
    });
    const linkedSet = new Set(linked.map(String));
    const unlinked = itemIds.filter((id) => !linkedSet.has(String(id)));

    await Promise.all([
        linked.length
            ? ReferenceCatalogItemModel.updateMany({ _id: { $in: linked } }, { $set: { linked: true } })
            : null,
        unlinked.length
            ? ReferenceCatalogItemModel.updateMany({ _id: { $in: unlinked } }, { $set: { linked: false } })
            : null,
    ]);
}
