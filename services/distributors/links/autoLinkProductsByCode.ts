import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import {
    candidatesFromIndex,
    findCodeMatches,
    indexItemsByCode,
} from "@/lib/distributors/productLinks";
import type { AutoLinkReport } from "@/types/shared/distributorLink";
import { getAllLocalCatalogItemsWithCodes } from "./localCatalogItems";

interface ProductLean {
    _id: { toString(): string };
    name: string;
    mpn?: string;
    sku?: string;
    gtin?: string;
}

/**
 * Vincula en lote los productos con Invid y AIR cuando hay exactamente un ítem con el mismo
 * part number (mpn o sku) o EAN. No toca vínculos existentes; los casos con más de un
 * candidato se informan para resolverlos a mano desde el producto.
 */
export async function autoLinkProductsByCode(): Promise<AutoLinkReport> {
    await connectDB();

    const [products, items, existing] = await Promise.all([
        ProductModel.find(
            {
                type: { $ne: "bundle" },
                slug: { $ne: CUSTOM_PC_SYSTEM_SLUG },
                $or: [{ mpn: { $nin: [null, ""] } }, { sku: { $nin: [null, ""] } }, { gtin: { $nin: [null, ""] } }],
            },
            { name: 1, mpn: 1, sku: 1, gtin: 1 },
        ).lean<ProductLean[]>(),
        getAllLocalCatalogItemsWithCodes(),
        ProductDistributorLinkModel.find({}, { productId: 1, distributor: 1 }).lean<
            { productId: { toString(): string }; distributor: string }[]
        >(),
    ]);

    const linkedKeys = new Set(existing.map((l) => `${l.productId.toString()}:${l.distributor}`));
    const index = indexItemsByCode(items);
    const now = new Date();

    const toInsert: Record<string, unknown>[] = [];
    const report: AutoLinkReport = { linked: 0, ambiguous: [], scannedProducts: products.length };

    for (const product of products) {
        const productId = product._id.toString();
        const candidates = candidatesFromIndex(product, index);
        if (candidates.length === 0) continue;

        for (const [distributor, matches] of findCodeMatches(product, candidates)) {
            if (linkedKeys.has(`${productId}:${distributor}`)) continue;
            if (matches.length > 1) {
                report.ambiguous.push({ productId, productName: product.name, distributor, candidates: matches.length });
                continue;
            }
            const { item, method } = matches[0];
            toInsert.push({
                productId,
                distributor,
                distributorProductId: item.distributorProductId,
                distributorSku: item.distributorSku,
                name: item.name,
                link: item.link,
                image: item.image,
                matchMethod: method,
                lastPrice: item.price,
                lastStock: item.stock,
                lastStockLabel: item.stockLabel ?? null,
                lastCheckedAt: now,
            });
        }
    }

    if (toInsert.length > 0) {
        // ordered: false → si otro proceso vinculó en el medio, el índice único descarta ese y sigue
        const result = await ProductDistributorLinkModel.insertMany(toInsert, { ordered: false }).catch(
            (err: { insertedDocs?: unknown[] }) => {
                if (Array.isArray(err.insertedDocs)) return err.insertedDocs;
                throw err;
            },
        );
        report.linked = result.length;
    }

    return report;
}
