"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface Props {
    categories: { id: string; name: string; depth: number }[];
}

const selectClass =
    "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand";

/** Filtros de la revisión de precios en la URL (categoría y estado de publicación). */
export function PriceReviewFilters({ categories }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const setParam = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <>
            <select
                value={searchParams.get("category") || ""}
                onChange={(e) => setParam("category", e.target.value)}
                className={selectClass}
            >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                        {"  ".repeat(c.depth)}
                        {c.name}
                    </option>
                ))}
            </select>
            <select
                value={searchParams.get("status") || "publish"}
                onChange={(e) => setParam("status", e.target.value === "publish" ? "" : e.target.value)}
                className={selectClass}
            >
                <option value="publish">Sólo publicados</option>
                <option value="all">Todos los estados</option>
            </select>
        </>
    );
}
