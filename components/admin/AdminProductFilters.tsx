"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CategoryDTO } from "@/types/shared/category";

interface Props {
    categories: CategoryDTO[];
}

interface HierarchicalCategory {
    id: string;
    slug: string;
    name: string;
    level: number;
}

function buildCategoryHierarchy(categories: CategoryDTO[]): HierarchicalCategory[] {
    const result: HierarchicalCategory[] = [];
    const childrenMap = new Map<string, CategoryDTO[]>();
    const idSet = new Set(categories.map((c) => c.id));
    const roots: CategoryDTO[] = [];

    // Separar raíces y agrupar hijos por parentId
    for (const cat of categories) {
        if (!cat.parentId || !idSet.has(cat.parentId)) {
            roots.push(cat);
        } else {
            const list = childrenMap.get(cat.parentId) || [];
            list.push(cat);
            childrenMap.set(cat.parentId, list);
        }
    }

    // Ordenar raíces alfabéticamente
    roots.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

    // Ordenar hijos alfabéticamente
    for (const [, children] of childrenMap.entries()) {
        children.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    }

    const visited = new Set<string>();

    function traverse(category: CategoryDTO, level: number) {
        if (visited.has(category.id)) return;
        visited.add(category.id);

        result.push({
            id: category.id,
            slug: category.slug,
            name: category.name,
            level,
        });

        const children = childrenMap.get(category.id) || [];
        for (const child of children) {
            traverse(child, level + 1);
        }
    }

    for (const root of roots) {
        traverse(root, 0);
    }

    return result;
}

export function AdminProductFilters({ categories }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentCategory = searchParams.get("category") || "";
    const currentStock = searchParams.get("stock") || "";
    const currentQuality = searchParams.get("quality") || "";
    const currentStatus = searchParams.get("status") || "";

    const hierarchicalCategories = useMemo(
        () => buildCategoryHierarchy(categories),
        [categories],
    );

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("category");
        params.delete("stock");
        params.delete("quality");
        params.delete("status");
        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = Boolean(
        currentCategory || currentStock || currentQuality || currentStatus,
    );

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro por Categoría con Jerarquía */}
            <div className="flex items-center gap-2">
                <label
                    htmlFor="category-filter"
                    className="text-xs text-gray-400 shrink-0 font-medium"
                >
                    Categoría:
                </label>
                <select
                    id="category-filter"
                    value={currentCategory}
                    onChange={(e) => updateFilter("category", e.target.value)}
                    className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-xl px-3 py-2 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors max-w-xs"
                >
                    <option value="">Todas las categorías</option>
                    {hierarchicalCategories.map((cat) => {
                        const prefix =
                            cat.level === 0
                                ? ""
                                : `${"\u00A0\u00A0".repeat(cat.level)}└─ `;
                        return (
                            <option key={cat.id} value={cat.slug}>
                                {prefix}
                                {cat.name}
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* Filtro por Stock */}
            <div className="flex items-center gap-2">
                <label
                    htmlFor="stock-filter"
                    className="text-xs text-gray-400 shrink-0 font-medium"
                >
                    Stock:
                </label>
                <select
                    id="stock-filter"
                    value={currentStock}
                    onChange={(e) => updateFilter("stock", e.target.value)}
                    className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-xl px-3 py-2 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                >
                    <option value="">Todos los niveles</option>
                    <option value="in_stock">Con stock</option>
                    <option value="out_of_stock">Sin stock</option>
                </select>
            </div>

            {/* Filtro por Calidad */}
            <div className="flex items-center gap-2">
                <label
                    htmlFor="quality-filter"
                    className="text-xs text-gray-400 shrink-0 font-medium"
                >
                    Calidad:
                </label>
                <select
                    id="quality-filter"
                    value={currentQuality}
                    onChange={(e) => updateFilter("quality", e.target.value)}
                    className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-xl px-3 py-2 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-colors"
                >
                    <option value="">Todas las calidades</option>
                    <option value="optimal">Óptima (≥ 90%)</option>
                    <option value="warnings">Con avisos (70% - 89%)</option>
                    <option value="critical">Crítica (&lt; 70% o con errores)</option>
                    <option value="missing_attributes">
                        Sin atributos de categoría
                    </option>
                </select>
            </div>

            {/* Filtro por Estado */}
            <div className="flex items-center gap-2">
                <label
                    htmlFor="status-filter"
                    className="text-xs text-gray-400 shrink-0 font-medium"
                >
                    Estado:
                </label>
                <select
                    id="status-filter"
                    value={currentStatus}
                    onChange={(e) => updateFilter("status", e.target.value)}
                    className={`border text-xs rounded-xl px-3 py-2 outline-none transition-colors ${
                        currentStatus === "pending_review"
                            ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-300 font-semibold"
                            : "bg-gray-900 border-gray-800 text-gray-200 focus:border-brand focus:ring-1 focus:ring-brand"
                    }`}
                >
                    <option value="">Todos los estados</option>
                    <option value="publish">Publicados</option>
                    <option value="pending_review">
                        ⚠️ Pendientes de revisión
                    </option>
                    <option value="draft">Borradores</option>
                    <option value="private">Privados</option>
                </select>
            </div>

            {/* Botón limpiar */}
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={handleClearFilters}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-800 border border-gray-700/50 rounded-xl transition-all"
                >
                    Limpiar filtros ✕
                </button>
            )}
        </div>
    );
}
