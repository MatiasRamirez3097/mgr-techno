import { buildNameIndex } from "@/lib/distributors/nameMatching";
import { indexReferenceItemsByCode, type ReferenceMatchItem } from "@/lib/priceReference/referenceMatching";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";

/**
 * Ítems de las tiendas de referencia que se pueden vincular (ya leídos y en el sitemap),
 * con los índices por código y por nombre. Unos miles de ítems: se arma en cada consulta.
 */
export async function loadReferenceMatchCatalog() {
    const docs = await ReferenceCatalogItemModel.find(
        { inSitemap: true, price: { $ne: null }, name: { $ne: "" } },
        { source: 1, name: 1, sku: 1, gtin: 1 },
    ).lean<{ _id: { toString(): string }; source: string; name: string; sku?: string; gtin?: string }[]>();

    const items: ReferenceMatchItem[] = docs.map((d) => ({
        id: d._id.toString(),
        source: d.source,
        name: d.name,
        sku: d.sku ?? "",
        gtin: d.gtin ?? "",
    }));
    return { items, codeIndex: indexReferenceItemsByCode(items), nameIndex: buildNameIndex(items) };
}
