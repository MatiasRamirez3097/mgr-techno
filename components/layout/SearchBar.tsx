"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface Suggestion {
    id: number;
    name: string;
    slug: string;
    price: number;
    image: string;
    inStock: boolean;
}

export function SearchBar() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cerrar al hacer click afuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Debounce de búsqueda
    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/search?q=${encodeURIComponent(query)}`,
                );
                const data = await res.json();
                setSuggestions(data);
                setOpen(true);
            } finally {
                setLoading(false);
            }
        }, 350);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setOpen(false);
        router.push(`/products?search=${encodeURIComponent(query.trim())}`);
    };

    const handleSelect = () => {
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <form onSubmit={handleSubmit} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {loading ? (
                        <svg
                            className="w-4 h-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
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
                                d="M4 12a8 8 0 018-8v8z"
                            />
                        </svg>
                    ) : (
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
                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z"
                            />
                        </svg>
                    )}
                </span>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    placeholder="Buscar productos..."
                    className="w-full bg-gray-800 text-white text-sm rounded-full py-2 pl-9 pr-4 outline-none border border-gray-700 focus:border-brand transition-colors placeholder:text-gray-500"
                />
            </form>

            {/* Sugerencias */}
            {open && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    {suggestions.map((s) => (
                        <Link
                            key={s.id}
                            href={`/products/${s.slug}`}
                            onClick={handleSelect}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors"
                        >
                            {/* Imagen */}
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                                {s.image ? (
                                    <Image
                                        src={s.image}
                                        alt={s.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-700" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">
                                    {s.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                    ${s.price.toLocaleString("es-AR")}
                                    {!s.inStock && (
                                        <span className="ml-2 text-red-400">
                                            Sin stock
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* Flecha */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 text-gray-600 shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </Link>
                    ))}

                    {/* Ver todos los resultados */}
                    <button
                        onClick={() => {
                            setOpen(false);
                            router.push(
                                `/products?search=${encodeURIComponent(query)}`,
                            );
                        }}
                        className="w-full px-4 py-3 text-sm text-brand hover:bg-gray-800 transition-colors text-left border-t border-gray-800"
                    >
                        Ver todos los resultados para "{query}" →
                    </button>
                </div>
            )}

            {/* Sin resultados */}
            {open &&
                !loading &&
                suggestions.length === 0 &&
                query.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50">
                        <p className="px-4 py-3 text-sm text-gray-400">
                            No se encontraron productos para "{query}"
                        </p>
                    </div>
                )}
        </div>
    );
}
