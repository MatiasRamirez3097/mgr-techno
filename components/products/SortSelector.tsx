"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const OPTIONS = [
    { value: "date", label: "Más nuevos" },
    { value: "popularity", label: "Más populares" },
    { value: "price", label: "Menor precio" },
    { value: "price-desc", label: "Mayor precio" },
    { value: "name", label: "Nombre A-Z" },
];

export function SortSelector() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const current = searchParams.get("orderby") || "date";

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
            {OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}
