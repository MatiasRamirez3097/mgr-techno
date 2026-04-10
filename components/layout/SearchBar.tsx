"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    };

    return (
        <form onSubmit={handleSearch} className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                🔍
            </span>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-gray-800 text-white text-sm rounded-full py-2 pl-9 pr-4 outline-none border border-gray-600 focus:border-orange-500 transition-colors placeholder:text-gray-400"
            />
        </form>
    );
}
