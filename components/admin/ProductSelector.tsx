"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
    id: string;
    name: string;
}

interface Props {
    value: Product | null;
    onChange: (product: Product | null) => void;
}

export function ProductSelector({ value, onChange }: Props) {
    const [query, setQuery] = useState(value?.name || "");
    const [results, setResults] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const ref = useRef<HTMLDivElement>(null);

    // 🔎 buscar productos
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `/api/admin/products/search?q=${query}`,
                );
                const data = await res.json();
                setResults(data.products || []);
                setOpen(true);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    // cerrar al hacer click afuera
    useEffect(() => {
        const handleClick = (e: any) => {
            if (!ref.current?.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <input
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange(null);
                }}
                placeholder="Buscar producto..."
                className="w-full bg-gray-800 text-white text-sm rounded-lg px-4 py-3 border border-gray-700 focus:border-brand outline-none"
            />

            {open && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                                onChange(p);
                                setQuery(p.name);
                                setOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            )}

            {loading && (
                <div className="absolute right-3 top-3 text-xs text-gray-400">
                    ...
                </div>
            )}
        </div>
    );
}
