import { connectDB } from "@/lib/mongodb";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import {
    distributorItemKey,
    toDistributorKey,
    type LinkedProductRef,
} from "@/lib/distributors/productLinks";
import type { NormalizedProduct } from "@/types/shared/distributor";

/** Productos propios vinculados a cada resultado del comparador (puede haber más de uno). */
export async function getLinksForDistributorItems(
    items: Pick<NormalizedProduct, "distributor" | "id">[],
): Promise<Record<string, LinkedProductRef[]>> {
    const or = items.flatMap((item) => {
        const distributor = toDistributorKey(item.distributor);
        return distributor ? [{ distributor, distributorProductId: String(item.id) }] : [];
    });
    if (or.length === 0) return {};

    await connectDB();
    const links = await ProductDistributorLinkModel.find({ $or: or }, { distributor: 1, distributorProductId: 1, productId: 1 })
        .populate<{ productId: { _id: { toString(): string }; name: string } | null }>("productId", "name")
        .lean<{ distributor: string; distributorProductId: string; productId: { _id: { toString(): string }; name: string } | null }[]>();

    const result: Record<string, LinkedProductRef[]> = {};
    for (const link of links) {
        if (!link.productId) continue;
        const key = distributorItemKey(link.distributor, link.distributorProductId);
        (result[key] ??= []).push({ productId: link.productId._id.toString(), productName: link.productId.name });
    }
    return result;
}
