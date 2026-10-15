"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CategoryDTO } from "@/types/shared/category";

interface Props {
    categories: CategoryDTO[];
}

export function AdminProductFilters({ categories }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentCategory = searchParams.get("category") || "";
    const currentStock = searchParams.get("stock") || "";

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
        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = Boolean(currentCategory || currentStock);

    // Sort categories alphabetically
    const sortedCategories = [...categories].sort((a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro por Categoría */}
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
                    {sortedCategories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                            {cat.name}
                        </option>
                    ))}
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
