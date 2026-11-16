import {
    candidatesFromIndex,
    findCodeMatches,
    indexItemsByCode,
    type CodeMatchItem,
    type CodeMatchProduct,
} from "./productLinks";
import { buildNameIndex, findNameMatches } from "./nameMatching";
import type { DistributorKey } from "@/types/shared/distributorLink";

// Ítem de un catálogo de distribuidor, listo para sugerir
export interface SuggestionCatalogItem extends CodeMatchItem {
    distributorProductId: string;
    distributorSku: string;
    name: string;
    link: string | null;
    image: string | null;
    price: number;
    stock: number;
    stockLabel?: string;
}

export interface SuggestionProduct extends CodeMatchProduct {
    id: string;
    name: string;
}

export interface GeneratedSuggestion {
    productId: string;
    item: SuggestionCatalogItem;
    matchMethod: "part_number" | "ean" | "name";
    matchedValue: string;
    score: number;
}

// Máximo de sugerencias por producto y distribuidor
export const MAX_CODE_SUGGESTIONS = 3;
export const MAX_NAME_SUGGESTIONS = 2;

export const suggestionKey = (productId: string, distributor: string, itemId: string) =>
    `${productId}:${distributor}:${itemId}`;

/**
 * Sugerencias de vínculo para cada producto, en los distribuidores con los que todavía no está
 * vinculado: primero por part number/EAN y, si no hay, por nombre parecido. Omite las que el
 * admin ya descartó.
 */
export function buildLinkSuggestions(
    products: SuggestionProduct[],
    items: SuggestionCatalogItem[],
    {
        linkedDistributors,
        dismissed,
    }: {
        // productId → distribuidores ya vinculados
        linkedDistributors: Map<string, Set<DistributorKey>>;
        // claves de suggestionKey descartadas
        dismissed: Set<string>;
    },
): GeneratedSuggestion[] {
    const codeIndex = indexItemsByCode(items);
    const nameIndex = buildNameIndex(items);
    const result: GeneratedSuggestion[] = [];

    for (const product of products) {
        const linked = linkedDistributors.get(product.id) ?? new Set<DistributorKey>();
        const isOpen = (item: SuggestionCatalogItem) =>
            !linked.has(item.distributor) &&
            !dismissed.has(suggestionKey(product.id, item.distributor, item.distributorProductId));

        const withCode = new Set<DistributorKey>();
        const codeCandidates = candidatesFromIndex(product, codeIndex).filter(isOpen);
        for (const [distributor, matches] of findCodeMatches(product, codeCandidates)) {
            withCode.add(distributor);
            for (const { item, method, matchedValue } of matches.slice(0, MAX_CODE_SUGGESTIONS)) {
                result.push({ productId: product.id, item, matchMethod: method, matchedValue, score: 1 });
            }
        }

        // Por nombre sólo en los distribuidores sin coincidencia por código
        const perDistributor = new Map<DistributorKey, number>();
        const nameMatches = findNameMatches(product.name, nameIndex, {
            limit: 20,
            filter: (item) => isOpen(item) && !withCode.has(item.distributor),
        });
        for (const { item, score } of nameMatches) {
            const count = perDistributor.get(item.distributor) ?? 0;
            if (count >= MAX_NAME_SUGGESTIONS) continue;
            perDistributor.set(item.distributor, count + 1);
            result.push({
                productId: product.id,
                item,
                matchMethod: "name",
                matchedValue: "",
                score: Math.round(score * 100) / 100,
            });
        }
    }
    return result;
}
