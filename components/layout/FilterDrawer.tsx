"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { AvailableAttributeFacet } from "@/types/shared/product";

interface Brand {
    _id: string;
    name: string;
    slug: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    brands: Brand[];
    attributes?: AvailableAttributeFacet[];
    initialHideOutOfStock: boolean;
    initialIsOutlet?: boolean;
}

export function FilterDrawer({
    open,
    onClose,
    brands,
    attributes = [],
    initialHideOutOfStock,
    initialIsOutlet = false,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
    const [selectedAttributes, setSelectedAttributes] = useState<
        Record<string, string[]>
    >({});
    const [expandedFacets, setExpandedFacets] = useState<
        Record<string, boolean>
    >({});
    const [hideOutOfStock, setHideOutOfStock] = useState(initialHideOutOfStock);
    const [isOutlet, setIsOutlet] = useState(initialIsOutlet);

    useEffect(() => {
        const brandParam = searchParams.get("brand");
        if (brandParam) {
            setSelectedBrands(brandParam.split(",").filter(Boolean));
        } else {
            setSelectedBrands([]);
        }

        const nextAttrs: Record<string, string[]> = {};
        searchParams.forEach((val, key) => {
            if (key.startsWith("attr_") && val) {
                const attrKey = key.slice("attr_".length);
                const list = val
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (attrKey && list.length > 0) {
                    nextAttrs[attrKey] = list;
                }
            }
        });
        setSelectedAttributes(nextAttrs);

        // Expandir por defecto los atributos que tengan filtros activos o los primeros 4
        const initialExpanded: Record<string, boolean> = {};
        attributes.forEach((facet, idx) => {
            initialExpanded[facet.key] =
                Boolean(nextAttrs[facet.key]?.length) || idx < 4;
        });
        setExpandedFacets((prev) => ({
            ...initialExpanded,
            ...prev,
        }));

        setHideOutOfStock(initialHideOutOfStock);
        setIsOutlet(initialIsOutlet);
    }, [searchParams, initialHideOutOfStock, initialIsOutlet, open, attributes]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const handleToggleBrand = (brandSlug: string) => {
        setSelectedBrands((prev) =>
            prev.includes(brandSlug)
                ? prev.filter((slug) => slug !== brandSlug)
                : [...prev, brandSlug],
        );
    };

    const handleToggleAttributeValue = (attrKey: string, val: string) => {
        setSelectedAttributes((prev) => {
            const current = prev[attrKey] || [];
            const exists = current.includes(val);
            const nextList = exists
                ? current.filter((v) => v !== val)
                : [...current, val];

            if (nextList.length === 0) {
                const copy = { ...prev };
                delete copy[attrKey];
                return copy;
            }
            return {
                ...prev,
                [attrKey]: nextList,
            };
        });
    };

    const toggleFacetExpanded = (key: string) => {
        setExpandedFacets((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleApply = () => {
        document.cookie = `hideOutOfStock=${hideOutOfStock}; path=/; max-age=31536000`;

        const params = new URLSearchParams(searchParams.toString());

        if (selectedBrands.length > 0) {
            params.set("brand", selectedBrands.join(","));
        } else {
            params.delete("brand");
        }

        if (isOutlet) {
            params.set("isOutlet", "true");
        } else {
            params.delete("isOutlet");
        }

        // Limpiar primero todos los attr_* previos de la URL
        const keysToDelete: string[] = [];
        params.forEach((_, k) => {
            if (k.startsWith("attr_")) {
                keysToDelete.push(k);
            }
        });
        for (const k of keysToDelete) {
            params.delete(k);
        }

        // Setear los atributos seleccionados actualmente
        for (const [attrKey, values] of Object.entries(selectedAttributes)) {
            if (values && values.length > 0) {
                params.set(`attr_${attrKey}`, values.join(","));
            }
        }

        params.delete("page");

        router.push(`${pathname}?${params.toString()}`);
        router.refresh();
        onClose();
    };

    const handleClear = () => {
        setSelectedBrands([]);
        setSelectedAttributes({});
        setIsOutlet(false);

        document.cookie = `hideOutOfStock=false; path=/; max-age=31536000`;

        const params = new URLSearchParams(searchParams.toString());
        params.delete("brand");
        params.delete("isOutlet");
        params.delete("page");

        const keysToDelete: string[] = [];
        params.forEach((_, k) => {
            if (k.startsWith("attr_")) {
                keysToDelete.push(k);
            }
        });
        for (const k of keysToDelete) {
            params.delete(k);
        }

        router.push(`${pathname}?${params.toString()}`);
        router.refresh();
        onClose();
    };

    return (
        <>
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
                    open ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            />

            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gray-900 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white">Filtros</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
                    {/* Switch para Filtrar Solo Outlet */}
                    <div>
                        <h3 className="text-purple-400 font-semibold mb-3 text-xs uppercase tracking-wider">
                            Ofertas Especiales
                        </h3>
                        <label className="flex items-center justify-between cursor-pointer group bg-gray-800/30 border border-purple-500/20 p-3 rounded-xl hover:border-purple-500/50 transition-colors">
                            <span className="text-gray-300 font-medium group-hover:text-white transition-colors text-sm">
                                Ver solo Outlet
                            </span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isOutlet}
                                    onChange={() => setIsOutlet(!isOutlet)}
                                />
                                <div className="w-11 h-6 bg-gray-800 border border-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:border-purple-500"></div>
                            </div>
                        </label>
                    </div>

                    {/* Switch Disponibilidad */}
                    <div className="border-t border-gray-800 pt-5">
                        <h3 className="text-gray-400 font-semibold mb-3 text-xs uppercase tracking-wider">
                            Disponibilidad
                        </h3>
                        <label className="flex items-center justify-between cursor-pointer group bg-gray-800/30 border border-gray-700 p-3 rounded-xl hover:border-brand/50 transition-colors">
                            <span className="text-gray-300 font-medium group-hover:text-white transition-colors text-sm">
                                Solo productos en stock
                            </span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={hideOutOfStock}
                                    onChange={() =>
                                        setHideOutOfStock(!hideOutOfStock)
                                    }
                                />
                                <div className="w-11 h-6 bg-gray-800 border border-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand peer-checked:border-brand"></div>
                            </div>
                        </label>
                    </div>

                    {/* Marcas */}
                    {brands && brands.length > 0 && (
                        <div className="border-t border-gray-800 pt-5">
                            <h3 className="font-semibold mb-3 text-xs uppercase tracking-wider text-gray-400">
                                Marcas
                            </h3>
                            <div className="flex flex-col gap-2.5 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                                {brands.map((brand) => (
                                    <label
                                        key={brand.slug}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedBrands.includes(
                                                brand.slug,
                                            )}
                                            onChange={() =>
                                                handleToggleBrand(brand.slug)
                                            }
                                            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-brand focus:ring-brand focus:ring-offset-gray-900 cursor-pointer flex-shrink-0"
                                        />
                                        <span className="text-gray-300 group-hover:text-white transition-colors text-sm truncate">
                                            {brand.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Atributos dinámicos según los productos del catálogo consultado */}
                    {attributes && attributes.length > 0 && (
                        <div className="border-t border-gray-800 pt-5 flex flex-col gap-4">
                            <h3 className="font-semibold text-xs uppercase tracking-wider text-brand">
                                Especificaciones
                            </h3>

                            {attributes.map((facet) => {
                                const selectedForFacet =
                                    selectedAttributes[facet.key] || [];
                                const isExpanded =
                                    expandedFacets[facet.key] ?? true;

                                return (
                                    <div
                                        key={facet.key}
                                        className="rounded-xl border border-gray-800 bg-gray-800/20 overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleFacetExpanded(facet.key)
                                            }
                                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-sm font-medium text-white truncate">
                                                    {facet.label}
                                                </span>
                                                {selectedForFacet.length >
                                                    0 && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand text-white shrink-0">
                                                        {
                                                            selectedForFacet.length
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
                                                    isExpanded
                                                        ? "rotate-180"
                                                        : ""
                                                }`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-4 pb-3 pt-1 flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar border-t border-gray-800/60">
                                                {facet.options.map((opt) => {
                                                    const checked =
                                                        selectedForFacet.includes(
                                                            opt.value,
                                                        );
                                                    return (
                                                        <label
                                                            key={opt.value}
                                                            className="flex items-center justify-between gap-2 cursor-pointer group py-0.5"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        checked
                                                                    }
                                                                    onChange={() =>
                                                                        handleToggleAttributeValue(
                                                                            facet.key,
                                                                            opt.value,
                                                                        )
                                                                    }
                                                                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-brand focus:ring-brand focus:ring-offset-gray-900 cursor-pointer shrink-0"
                                                                />
                                                                <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                                                                    {
                                                                        opt.displayValue
                                                                    }
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 font-mono shrink-0">
                                                                ({opt.count})
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-800 flex flex-col gap-3 bg-gray-900">
                    <button
                        onClick={handleApply}
                        className="w-full py-3 rounded-xl text-center text-white font-medium bg-brand hover:brightness-110 transition-all shadow-lg shadow-brand/20"
                    >
                        Aplicar filtros
                    </button>
                    <button
                        onClick={handleClear}
                        className="w-full py-2 rounded-xl text-center text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        Limpiar todo
                    </button>
                </div>
            </div>
        </>
    );
}
