import { connectDB } from "@/lib/mongodb";
import { findReferenceCodeMatches } from "@/lib/priceReference/referenceMatching";
import { ProductModel } from "@/models/Product";
import { ProductReferenceLinkModel } from "@/models/ProductReferenceLink";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import type { ReferenceAutoLinkReport } from "@/types/shared/priceReference";
import { loadReferenceMatchCatalog } from "./referenceMatchCatalog";
import { syncLinkedFlags } from "./syncLinkedFlags";

/**
 * Vincula en lote los productos con las tiendas de referencia cuando hay exactamente un ítem
 * con el mismo part number (mpn o sku) o EAN. No toca vínculos existentes (tampoco los que el
 * admin cambió a mano). Corre al terminar cada pasada de lectura.
 */
export async function autoLinkReferencesByCode(): Promise<ReferenceAutoLinkReport> {
    await connectDB();

    const [products, catalog, existing] = await Promise.all([
        ProductModel.find(
            {
                type: { $ne: "bundle" },
                slug: { $ne: CUSTOM_PC_SYSTEM_SLUG },
                $or: [
                    { mpn: { $nin: [null, ""] } },
                    { sku: { $nin: [null, ""] } },
                    { gtin: { $nin: [null, ""] } },
                ],
            },
            { name: 1, mpn: 1, sku: 1, gtin: 1 },
        ).lean<{ _id: { toString(): string }; name: string; mpn?: string; sku?: string; gtin?: string }[]>(),
        loadReferenceMatchCatalog(),
        ProductReferenceLinkModel.find({}, { productId: 1, source: 1 }).lean<
            { productId: { toString(): string }; source: string }[]
        >(),
    ]);

    const linkedKeys = new Set(existing.map((l) => `${l.productId.toString()}:${l.source}`));
    const toInsert: { productId: string; source: string; itemId: string; matchMethod: string }[] = [];
    let ambiguous = 0;

    for (const product of products) {
        const productId = product._id.toString();
        for (const [source, matches] of findReferenceCodeMatches(product, catalog.codeIndex)) {
            if (linkedKeys.has(`${productId}:${source}`)) continue;
            if (matches.length > 1) {
                ambiguous++;
                continue;
            }
            const { item, method } = matches[0];
            toInsert.push({ productId, source, itemId: item.id, matchMethod: method });
        }
    }

    let linked = 0;
    if (toInsert.length) {
        // ordered: false → si otro proceso vinculó en el medio, el índice único descarta ese y sigue
        const inserted = await ProductReferenceLinkModel.insertMany(toInsert, { ordered: false }).catch(
            (err: { insertedDocs?: unknown[] }) => {
                if (Array.isArray(err.insertedDocs)) return err.insertedDocs;
                throw err;
            },
        );
        linked = inserted.length;
        await syncLinkedFlags(toInsert.map((l) => l.itemId));
    }

    return { linked, ambiguous };
}
