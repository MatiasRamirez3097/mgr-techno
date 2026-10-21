import type {
    CategoryAttributeDefinitionDTO,
    CategoryDTO,
} from "@/types/shared/category";

/**
 * Computes the effective list of attribute definitions for a list of selected category IDs,
 * traversing up the `parentId` hierarchy so subcategories inherit parent attributes.
 * If multiple categories define the same `key`, options are merged and the most specific definition wins.
 */
export function getEffectiveCategoryAttributeDefinitions(
    selectedCategoryIds: string[],
    allCategories: CategoryDTO[],
): CategoryAttributeDefinitionDTO[] {
    if (!selectedCategoryIds.length || !allCategories.length) return [];

    const categoryMap = new Map<string, CategoryDTO>();
    for (const cat of allCategories) {
        categoryMap.set(cat.id, cat);
    }

    // Collect categories ordered from root ancestors down to the selected categories
    const orderedCategories: CategoryDTO[] = [];
    const visitedIds = new Set<string>();

    for (const catId of selectedCategoryIds) {
        const chain: CategoryDTO[] = [];
        let curr = categoryMap.get(catId);
        const loopGuard = new Set<string>();

        while (curr && !loopGuard.has(curr.id)) {
            loopGuard.add(curr.id);
            chain.unshift(curr); // ancestor first
            curr = curr.parentId ? categoryMap.get(curr.parentId) : undefined;
        }

        for (const item of chain) {
            if (!visitedIds.has(item.id)) {
                visitedIds.add(item.id);
                orderedCategories.push(item);
            }
        }
    }

    const definitionsByKey = new Map<string, CategoryAttributeDefinitionDTO>();

    for (const cat of orderedCategories) {
        const defs = cat.attributeDefinitions || [];
        for (const def of defs) {
            if (!def.key) continue;
            const existing = definitionsByKey.get(def.key);
            if (!existing) {
                definitionsByKey.set(def.key, {
                    ...def,
                    options: [...(def.options || [])],
                });
            } else {
                // Merge options without duplicates, let child override label/unit/required if specified
                const mergedOptions = Array.from(
                    new Set([...(existing.options || []), ...(def.options || [])]),
                );
                definitionsByKey.set(def.key, {
                    ...existing,
                    ...def,
                    options: mergedOptions,
                });
            }
        }
    }

    return Array.from(definitionsByKey.values());
}
