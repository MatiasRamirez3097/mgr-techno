"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function SortSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Verificamos si hay una búsqueda activa
    const hasSearch = searchParams.has("search");

    // Si hay búsqueda, el default es "relevance", sino "date_desc"
    const current =
        searchParams.get("orderby") || (hasSearch ? "relevance" : "date_desc");

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("orderby", e.target.value);
        params.delete("page"); // reset página al cambiar orden
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    return (
        <div className="relative flex items-center">
            {isPending && (
                <div className="fixed inset-x-0 top-0 z-50 pointer-events-none flex flex-col items-center">
                    <div className="w-full h-1 bg-gray-800 overflow-hidden">
                        <div className="h-full bg-brand w-1/2 animate-pulse" />
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gray-900/95 border border-brand/40 text-white text-xs font-medium shadow-xl backdrop-blur-md">
                        <svg
                            className="animate-spin h-4 w-4 text-brand"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <span>Ordenando productos...</span>
                    </div>
                </div>
            )}
            <select
                value={current}
                onChange={handleChange}
                disabled={isPending}
                className={`bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-brand outline-none transition-all cursor-pointer ${
                    isPending ? "opacity-60 pr-8" : ""
                }`}
            >
                {/* Solo mostramos Relevancia si están usando el buscador */}
                {hasSearch && <option value="relevance">Relevancia</option>}

                <option value="date_desc">Más nuevos</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="name_asc">Nombre A-Z</option>
                <option value="name_desc">Nombre Z-A</option>
            </select>
            {isPending && (
                <svg
                    className="animate-spin h-4 w-4 text-brand absolute right-2.5 pointer-events-none"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
            )}
        </div>
    );
}
