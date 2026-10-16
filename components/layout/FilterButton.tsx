"use client";

import { useState } from "react";
import { FilterDrawer } from "./FilterDrawer";
import { useSearchParams } from "next/navigation";
import type { AvailableAttributeFacet } from "@/types/shared/product";

interface Brand {
    _id: string;
    name: string;
    slug: string;
}

interface Props {
    brands: Brand[];
    attributes?: AvailableAttributeFacet[];
    initialHideOutOfStock?: boolean;
    initialIsOutlet?: boolean;
}

export function FilterButton({
    brands,
    attributes = [],
    initialHideOutOfStock = false,
    initialIsOutlet = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const searchParams = useSearchParams();

    // ==========================================
    // CÁLCULO DE FILTROS ACTIVOS
    // ==========================================
    const brandParam = searchParams.get("brand");
    const activeBrandsCount = brandParam
        ? brandParam.split(",").filter(Boolean).length
        : 0;

    let activeAttributesCount = 0;
    searchParams.forEach((val, key) => {
        if (key.startsWith("attr_") && val) {
            activeAttributesCount += val.split(",").filter(Boolean).length;
        }
    });

    const activeStockFilterCount = !initialHideOutOfStock ? 1 : 0;
    const activeOutletFilterCount = initialIsOutlet ? 1 : 0;

    const totalActiveFilters =
        activeBrandsCount +
        activeAttributesCount +
        activeStockFilterCount +
        activeOutletFilterCount;

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
                attributes={attributes}
                initialHideOutOfStock={initialHideOutOfStock}
                initialIsOutlet={initialIsOutlet}
            />
        </>
    );
}
