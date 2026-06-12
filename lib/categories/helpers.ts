import type { CategoryDTO } from "@/types/shared/category";
import { OFERTAS_SLUGS } from "./constants";

export function getRootCategories(categories: CategoryDTO[]) {
    return categories
        .filter(
            (c) =>
                c.parentId == null &&
                c.slug !== "uncategorized" &&
                c.slug !== "sin-categoria" &&
                !OFERTAS_SLUGS.includes(c.slug),
        )
        .sort((a, b) => (a.menuOrder ?? 999) - (b.menuOrder ?? 999));
}

export function getOfertaCategories(categories: CategoryDTO[]) {
    return categories
        .filter((c) => OFERTAS_SLUGS.includes(c.slug))
        .sort((a, b) => (a.menuOrder ?? 999) - (b.menuOrder ?? 999));
}

export function getChildren(categories: CategoryDTO[], parentId: string) {
    return categories
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => (a.menuOrder ?? 999) - (b.menuOrder ?? 999));
}
