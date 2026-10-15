"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";

interface Product {
    id: string;
    image: string;
    name: string;
    taxRate: number;
    regularPrice?: number;
    weight?: number;
    dimensions?: {
        width: number;
        height: number;
        length: number;
    };
}

interface Props {
    statusAll?: boolean;
    value: Product | null;
    onChange: (product: Product | null) => void;
}

export function ProductSelector({ statusAll, value, onChange }: Props) {
    const [query, setQuery] = useState(value?.name || "");
    const [results, setResults] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const statusAllProp = () => (statusAll ? `&statusAll=true` : "");

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }

        if (value && query === value.name) {
            return;
        }

        const timeout = setTimeout(async () => {
            setLoading(true);

            try {
                const res = await fetch(
                    `/api/products/search?q=${encodeURIComponent(query)}${statusAllProp()}`,
                );

                const data = await res.json();
                setResults(data || []);
                setOpen(true);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener("click", handleClick);

        return () => document.removeEventListener("click", handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <div className="relative">
                {value?.image && (
                    <Image
                        src={value.image}
                        alt={value.name}
                        width={32}
                        height={32}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded object-cover"
                    />
                )}

                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(null);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setOpen(true);
                    }}
                    placeholder="Buscar producto por nombre o SKU..."
                    className={`w-full bg-gray-800 text-white text-sm rounded-lg py-3 border border-gray-700 focus:border-brand outline-none pr-10 ${
                        value?.image ? "pl-14" : "px-4"
                    }`}
                />

                {loading ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-brand">
                        <svg
                            className="animate-spin h-4 w-4"
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
                    </div>
                ) : query ? (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery("");
                            onChange(null);
                            setResults([]);
                            setOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-xs"
                    >
                        ✕
                    </button>
                ) : null}
            </div>

            {open && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {results.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => {
                                onChange(p);
                                setQuery(p.name);
                                setOpen(false);
                            }}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-800 last:border-0"
                        >
                            {p.image ? (
                                <Image
                                    src={p.image}
                                    alt={p.name}
                                    width={36}
                                    height={36}
                                    className="rounded-lg object-cover bg-gray-800 shrink-0"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-xs text-gray-500 shrink-0">
                                    📦
                                </div>
                            )}

                            <span className="text-white text-sm line-clamp-1">
                                {p.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {open && !loading && results.length === 0 && query.length >= 2 && (
                <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-4 text-center text-xs text-gray-400">
                    No se encontraron productos para &quot;{query}&quot;
                </div>
            )}
        </div>
    );
}
