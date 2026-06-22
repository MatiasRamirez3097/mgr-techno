"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const OPTIONS = [
    { value: "newest", label: "Más nuevos" },
    { value: "oldest", label: "Más antiguos" },
    { value: "price-asc", label: "Menor precio" },
    { value: "price-desc", label: "Mayor precio" },
    { value: "name-asc", label: "Nombre A-Z" },
    { value: "name-desc", label: "Nombre Z-A" },
];

export function SortSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Verificamos si hay una búsqueda activa
    const hasSearch = searchParams.has("search");

    // Si hay búsqueda, el default es "relevance", sino "date_desc"
    const current =
        searchParams.get("orderby") || (hasSearch ? "relevance" : "date_desc");

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("orderby", e.target.value);
        params.delete("page"); // reset página al cambiar orden
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <select
            value={current}
            onChange={handleChange}
            className="bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-brand outline-none transition-colors cursor-pointer"
        >
            {/* Solo mostramos Relevancia si están usando el buscador */}
            {hasSearch && <option value="relevance">Relevancia</option>}

            <option value="date_desc">Más nuevos</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="name_asc">Nombre A-Z</option>
            <option value="name_desc">Nombre Z-A</option>
        </select>
    );
}
