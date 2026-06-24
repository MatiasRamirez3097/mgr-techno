"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import Image from "next/image";
import Link from "next/link";

interface Suggestion {
    id: string;
    name: string;
    slug: string;
    regularPrice: number;
    salePrice: number;
    image: string | null;
    isAvailable: boolean;
}

export const SearchBar = () => {
    const router = useRouter();

    const [query, setQuery] = useState("");

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const [loading, setLoading] = useState(false);

    const [open, setOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // =========================
    // CLOSE ON OUTSIDE CLICK
    // =========================

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);

        return () => {
            document.removeEventListener("mousedown", handler);
        };
    }, []);

    // =========================
    // SEARCH
    // =========================

    useEffect(() => {
        const trimmedQuery = query.trim();

        // Minimum chars

        if (trimmedQuery.length < 2) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        // Abort previous request

        const controller = new AbortController();

        // Clear previous debounce

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);

            try {
                const res = await fetch(
                    `/api/products/search?q=${encodeURIComponent(
                        trimmedQuery,
                    )}`,
                    {
                        signal: controller.signal,
                    },
                );

                if (!res.ok) {
                    throw new Error("Error searching products");
                }

                const data = await res.json();

                setSuggestions(data);

                setOpen(true);
            } catch (error: any) {
                // Ignore aborted requests

                if (error.name !== "AbortError") {
                    console.error(error);

                    setSuggestions([]);
                }
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            controller.abort();

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query]);

    // =========================
    // SUBMIT
    // =========================

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedQuery = query.trim();

        if (!trimmedQuery) return;

        setOpen(false);

        router.push(`/productos?search=${encodeURIComponent(trimmedQuery)}`);
    };

    // =========================
    // SELECT
    // =========================

    const handleSelect = () => {
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* ========================= */}
            {/* FORM */}
            {/* ========================= */}

            <form onSubmit={handleSubmit} className="relative">
                {/* ICON */}

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

                {/* INPUT */}

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (suggestions.length > 0) {
                            setOpen(true);
                        }
                    }}
                    placeholder="Buscar productos..."
                    className="
                        w-full
                        bg-gray-800
                        text-white
                        text-sm
                        rounded-full
                        py-2
                        pl-9
                        pr-4
                        outline-none
                        border
                        border-gray-700
                        focus:border-brand
                        transition-colors
                        placeholder:text-gray-500
                    "
                />
            </form>

            {/* ========================= */}
            {/* SUGGESTIONS */}
            {/* ========================= */}

            {open && suggestions.length > 0 && (
                <div
                    className="
                            absolute
                            top-full
                            left-0
                            right-0
                            mt-2
                            bg-gray-900
                            border
                            border-gray-700
                            rounded-xl
                            shadow-2xl
                            overflow-hidden
                            z-50
                        "
                >
                    {suggestions.map((suggestion) => (
                        <Link
                            key={suggestion.id}
                            href={`/productos/${suggestion.slug}`}
                            onClick={handleSelect}
                            className="
                                        flex
                                        items-center
                                        gap-3
                                        px-4
                                        py-3
                                        hover:bg-gray-800
                                        transition-colors
                                    "
                        >
                            {/* IMAGE */}

                            <div
                                className="
                                            relative
                                            w-10
                                            h-10
                                            rounded-lg
                                            overflow-hidden
                                            bg-gray-800
                                            shrink-0
                                        "
                            >
                                {suggestion.image ? (
                                    <Image
                                        src={suggestion.image}
                                        alt={suggestion.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-700" />
                                )}
                            </div>

                            {/* INFO */}

                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">
                                    {suggestion.name}
                                </p>

                                <p className="text-xs text-gray-400">
                                    $
                                    {suggestion.salePrice &&
                                    suggestion.salePrice > 0
                                        ? suggestion.salePrice.toLocaleString(
                                              "es-AR",
                                          )
                                        : suggestion.regularPrice.toLocaleString(
                                              "es-AR",
                                          )}
                                    {!suggestion.isAvailable ? (
                                        <span className="ml-2 text-red-400">
                                            Sin stock
                                        </span>
                                    ) : (
                                        <span className="ml-2 text-green-400">
                                            En stock
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* ARROW */}

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

                    {/* VIEW ALL */}

                    <button
                        onClick={() => {
                            setOpen(false);

                            router.push(
                                `/productos?search=${encodeURIComponent(
                                    query.trim(),
                                )}`,
                            );
                        }}
                        className="
                                w-full
                                px-4
                                py-3
                                text-sm
                                text-brand
                                hover:bg-gray-800
                                transition-colors
                                text-left
                                border-t
                                border-gray-800
                            "
                    >
                        Ver todos los resultados para "{query}" →
                    </button>
                </div>
            )}

            {/* ========================= */}
            {/* EMPTY */}
            {/* ========================= */}

            {open &&
                !loading &&
                suggestions.length === 0 &&
                query.trim().length >= 2 && (
                    <div
                        className="
                            absolute
                            top-full
                            left-0
                            right-0
                            mt-2
                            bg-gray-900
                            border
                            border-gray-700
                            rounded-xl
                            shadow-2xl
                            z-50
                        "
                    >
                        <p className="px-4 py-3 text-sm text-gray-400">
                            No se encontraron productos para "{query}"
                        </p>
                    </div>
                )}
        </div>
    );
};
