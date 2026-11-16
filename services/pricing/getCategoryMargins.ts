import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";
import type { CategoryMarginDTO } from "@/types/shared/priceReview";

interface CategoryLean {
    _id: { toString(): string };
    name: string;
    parentId?: { toString(): string } | null;
    menuOrder?: number;
    targetMarginPercent?: number | null;
    minMarginPercent?: number | null;
}

/** Categorías con sus márgenes, ordenadas como árbol (padre seguido de sus hijas). */
export async function getCategoryMargins(): Promise<CategoryMarginDTO[]> {
    await connectDB();
    const docs = await CategoryModel.find(
        {},
        { name: 1, parentId: 1, menuOrder: 1, targetMarginPercent: 1, minMarginPercent: 1 },
    ).lean<CategoryLean[]>();

    const ids = new Set(docs.map((d) => d._id.toString()));
    const byParent = new Map<string | null, CategoryLean[]>();
    for (const doc of docs) {
        const parent = doc.parentId?.toString() ?? null;
        // Una categoría cuyo padre no existe se muestra en la raíz
        const key = parent && ids.has(parent) ? parent : null;
        byParent.set(key, [...(byParent.get(key) ?? []), doc]);
    }

    const sortFn = (a: CategoryLean, b: CategoryLean) =>
        (a.menuOrder ?? 999) - (b.menuOrder ?? 999) || a.name.localeCompare(b.name, "es");

    const result: CategoryMarginDTO[] = [];
    const visited = new Set<string>();
    const walk = (parent: string | null, depth: number) => {
        for (const doc of [...(byParent.get(parent) ?? [])].sort(sortFn)) {
            const id = doc._id.toString();
            if (visited.has(id)) continue;
            visited.add(id);
            result.push({
                id,
                name: doc.name,
                parentId: doc.parentId?.toString() ?? null,
                depth,
                targetMarginPercent: doc.targetMarginPercent ?? null,
                minMarginPercent: doc.minMarginPercent ?? null,
            });
            walk(id, depth + 1);
        }
    };
    walk(null, 0);
    return result;
}
