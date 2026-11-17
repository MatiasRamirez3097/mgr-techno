import { connectDB } from "@/lib/mongodb";
import {
    mapReferenceItemToDTO,
    REFERENCE_ITEM_PROJECTION,
    type ReferenceCatalogItemDoc,
} from "@/lib/mappers/priceReferenceMapper";
import { looseWordPattern } from "@/lib/priceReference/search";
import { normalizeSearch } from "@/lib/search/normalize";
import { ReferenceCatalogItemModel } from "@/models/ReferenceCatalogItem";
import type { ReferenceCandidateDTO } from "@/types/shared/priceReference";

/**
 * Búsqueda manual en los catálogos de referencia: todas las palabras deben aparecer en el nombre,
 * la marca, el SKU o el GTIN (searchText, normalizado como en la tienda), sin importar espacios
 * dentro de cada palabra. Sólo encuentra ítems cuya página ya se leyó (antes no hay nombre ni precio).
 */
export async function searchReferenceCatalog(
    query: string,
    { source, limit = 20 }: { source?: string; limit?: number } = {},
): Promise<ReferenceCandidateDTO[]> {
    const words = normalizeSearch(query).split(/\s+/).filter(Boolean).slice(0, 8);
    if (!words.length) return [];
    await connectDB();

    const docs = await ReferenceCatalogItemModel.find(
        {
            inSitemap: true,
            price: { $ne: null },
            ...(source ? { source } : {}),
            $and: words.map((w) => ({ searchText: { $regex: looseWordPattern(w) } })),
        },
        REFERENCE_ITEM_PROJECTION,
    )
        .sort({ inStock: -1, name: 1 })
        .limit(limit)
        .lean<ReferenceCatalogItemDoc[]>();

    return docs.map((doc) => ({
        ...mapReferenceItemToDTO(doc),
        matchMethod: "manual" as const,
        matchedValue: "",
        score: 0,
    }));
}
