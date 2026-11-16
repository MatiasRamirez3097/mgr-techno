import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { ProductDistributorLinkModel } from "@/models/ProductDistributorLink";
import {
    buildLooseCodeRegex,
    findCodeMatches,
    normalizeEan,
    productMatchCodes,
    toDistributorKey,
    type CodeMatchItem,
} from "@/lib/distributors/productLinks";
import { getDistributorProducts } from "@/services/distributors/getDistributorProducts";
import type { DistributorLinkSuggestion } from "@/types/shared/distributorLink";
import type { NormalizedProduct } from "@/types/shared/distributor";
import { findLocalCatalogItemsByCodes } from "./localCatalogItems";

interface ProductCodes {
    name: string;
    mpn?: string;
    sku?: string;
    gtin?: string;
}

/**
 * Sugiere vínculos para un producto: ítems de los distribuidores cuyo part number coincide
 * exacto con su mpn o sku (o el EAN con su gtin). Invid y AIR se buscan en sus catálogos
 * locales; Elit y NewBytes, con una búsqueda en su API por el código del producto.
 * No sugiere lo que ya está vinculado.
 */
export async function suggestDistributorLinks(productId: string): Promise<DistributorLinkSuggestion[]> {
    if (!isValidObjectId(productId)) throw new Error("Producto no encontrado");
    await connectDB();

    const product = await ProductModel.findById(productId, { name: 1, mpn: 1, sku: 1, gtin: 1 }).lean<ProductCodes>();
    if (!product) throw new Error("Producto no encontrado");

    const codes = productMatchCodes(product);
    const ean = normalizeEan(product.gtin);
    if (codes.length === 0 && !ean) return [];

    // Para la API de Elit/NewBytes se busca con el código tal como está cargado
    const rawCode = (product.mpn || product.sku || "").trim();

    const [localItems, remoteProducts, existing] = await Promise.all([
        findLocalCatalogItemsByCodes(codes.map(buildLooseCodeRegex), ean),
        rawCode
            ? getDistributorProducts(rawCode, "", ["elit", "newbytes"]).catch(() => [] as NormalizedProduct[])
            : Promise.resolve([] as NormalizedProduct[]),
        ProductDistributorLinkModel.find({ productId }, { distributor: 1, distributorProductId: 1 }).lean<
            { distributor: string; distributorProductId: string }[]
        >(),
    ]);

    const alreadyLinked = new Set(existing.map((l) => `${l.distributor}:${l.distributorProductId}`));

    type Candidate = CodeMatchItem & Omit<DistributorLinkSuggestion, "matchMethod" | "matchedValue">;

    const candidates: Candidate[] = [
        ...localItems.map((i) => ({ ...i, stockLabel: i.stockLabel })),
        ...remoteProducts.flatMap((p) => {
            const distributor = toDistributorKey(p.distributor);
            if (!distributor) return [];
            return [
                {
                    distributor,
                    distributorProductId: String(p.id),
                    distributorSku: p.sku,
                    partNumber: p.sku,
                    ean: "",
                    name: p.name,
                    link: p.link,
                    image: p.image,
                    price: p.price,
                    stock: p.stock,
                    stockLabel: p.stockLabel,
                },
            ];
        }),
    ];

    const suggestions: DistributorLinkSuggestion[] = [];
    for (const matches of findCodeMatches(product, candidates).values()) {
        for (const { item, method, matchedValue } of matches) {
            if (alreadyLinked.has(`${item.distributor}:${item.distributorProductId}`)) continue;
            suggestions.push({
                distributor: item.distributor,
                distributorProductId: item.distributorProductId,
                distributorSku: item.distributorSku,
                name: item.name,
                link: item.link,
                image: item.image,
                price: item.price,
                stock: item.stock,
                ...(item.stockLabel ? { stockLabel: item.stockLabel } : {}),
                matchMethod: method,
                matchedValue,
            });
        }
    }

    return suggestions.sort((a, b) => a.price - b.price);
}
