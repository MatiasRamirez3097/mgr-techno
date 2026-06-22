"use client";

import { useState } from "react";
import { FilterDrawer } from "./FilterDrawer";

interface Brand {
    _id: string;
    name: string;
    slug: string;
}

export function FilterButton({ brands }: { brands: Brand[] }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg px-4 py-2 border border-gray-700 transition-colors"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                </svg>
                Filtros
            </button>

            <FilterDrawer
                open={open}
                onClose={() => setOpen(false)}
                brands={brands}
            />
        </>
    );
}
