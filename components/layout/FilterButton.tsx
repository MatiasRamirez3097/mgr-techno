"use client";

import { useState } from "react";
import { FilterDrawer } from "./FilterDrawer";
import { useSearchParams } from "next/navigation";

interface Brand {
    _id: string;
    name: string;
    slug: string;
}

interface Props {
    brands: Brand[];
    initialHideOutOfStock?: boolean;
}

export function FilterButton({ brands, initialHideOutOfStock = false }: Props) {
    const [open, setOpen] = useState(false);
    const searchParams = useSearchParams();
    // ==========================================
    // CÁLCULO DE FILTROS ACTIVOS
    // ==========================================
    // 1. Contamos cuántas marcas hay en la URL (separadas por coma)
    const brandParam = searchParams.get("brand");
    const activeBrandsCount = brandParam
        ? brandParam.split(",").filter(Boolean).length
        : 0;

    // 2. Si el switch de stock está activo, suma 1
    const activeStockFilterCount = initialHideOutOfStock ? 1 : 0;

    // 3. Total
    const totalActiveFilters = activeBrandsCount + activeStockFilterCount;

    // Permitimos abrir los filtros si hay marcas O si hay un filtro de stock aplicado
    if ((!brands || brands.length === 0) && !initialHideOutOfStock) return null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="
                    relative 
                    flex items-center gap-2 
                    px-4 py-2 
                    bg-gray-800 text-white text-sm 
                    rounded-lg border border-gray-700 
                    hover:border-brand hover:text-brand 
                    transition-colors outline-none
                "
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
                    />
                </svg>
                Filtros
                {/* ========================================== */}
                {/* BADGE DE NOTIFICACIÓN */}
                {/* ========================================== */}
                {totalActiveFilters > 0 && (
                    <span
                        className="
                            absolute -top-2.5 -right-2.5 
                            bg-brand text-white text-xs font-bold 
                            w-[22px] h-[22px] flex items-center justify-center 
                            rounded-full border-2 border-gray-900
                            shadow-sm
                        "
                    >
                        {totalActiveFilters}
                    </span>
                )}
            </button>

            <FilterDrawer
                open={open}
                onClose={() => setOpen(false)}
                brands={brands}
                initialHideOutOfStock={initialHideOutOfStock}
            />
        </>
    );
}
