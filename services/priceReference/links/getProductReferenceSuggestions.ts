import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
    mapReferenceItemToDTO,
    REFERENCE_ITEM_PROJECTION,
    type ReferenceCatalogItemDoc,
} from "@/lib/mappers/priceReferenceMapper";
import { suggestReferenceMatches } from "@/lib/priceReference/referenceMatching";
import { REFERENCE_SOURCE_KEYS } from "@/lib/priceReference/sources";
import { ProductModel } from "@/models/Product";
import { ProductReferenceLinkModel } from "@/models/ProductReferenceLink";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import type { ReferenceCandidateDTO } from "@/types/shared/priceReference";
import { loadReferenceMatchCatalog } from "./referenceMatchCatalog";

/**
 * Candidatos para vincular un producto en las tiendas de referencia con las que todavía no está
 * vinculado: por part number / EAN y, si no hay, por nombre parecido.
 */
export async function getProductReferenceSuggestions(productId: string): Promise<ReferenceCandidateDTO[]> {
    if (!isValidObjectId(productId)) throw new Error("Producto no encontrado");
    await connectDB();

    const [product, links] = await Promise.all([
        ProductModel.findById(productId, { name: 1, mpn: 1, sku: 1, gtin: 1 }).lean<{
            name: string;
            mpn?: string;
            sku?: string;
            gtin?: string;
        }>(),
        ProductReferenceLinkModel.find({ productId }, { source: 1, itemId: 1, dismissed: 1 }).lean<
            { source: string; itemId: { toString(): string }; dismissed?: boolean }[]
        >(),
    ]);
    if (!product) throw new Error("Producto no encontrado");

    const linkedSources = new Set(links.filter((l) => !l.dismissed).map((l) => l.source));
    // Lo que el admin desvinculó no se vuelve a sugerir
    const dismissedItems = new Set(links.filter((l) => l.dismissed).map((l) => l.itemId.toString()));
    const sources = REFERENCE_SOURCE_KEYS.filter((s) => !linkedSources.has(s));
    if (!sources.length) return [];

    const { codeIndex, nameIndex } = await loadReferenceMatchCatalog();
    const matches = suggestReferenceMatches(product, codeIndex, nameIndex, sources).filter(
        (m) => !dismissedItems.has(m.item.id),
    );
    if (!matches.length) return [];

    const docs = await ReferenceCatalogItemModel.find(
        { _id: { $in: matches.map((m) => m.item.id) } },
        REFERENCE_ITEM_PROJECTION,
    ).lean<ReferenceCatalogItemDoc[]>();
    const byId = new Map(docs.map((d) => [d._id.toString(), d]));

    return matches.flatMap((match) => {
        const doc = byId.get(match.item.id);
        if (!doc) return [];
        return [
            {
                ...mapReferenceItemToDTO(doc),
                matchMethod: match.method,
                matchedValue: match.matchedValue,
                score: match.score,
            },
        ];
    });
}
