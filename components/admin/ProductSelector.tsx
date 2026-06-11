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

    console.log(statusAllProp());
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        if (value && query === value.name) {
            return;
        }

        const timeout = setTimeout(async () => {
            setLoading(true);

            try {
                const res = await fetch(
                    `/api/products/search?q=${query}${statusAllProp()}`,
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
                    placeholder="Buscar producto..."
                    className={`w-full bg-gray-800 text-white text-sm rounded-lg py-3 border border-gray-700 focus:border-brand outline-none ${
                        value?.image ? "pl-14 pr-4" : "px-4"
                    }`}
                />
            </div>

            {open && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => {
                                onChange(p);
                                setQuery(p.name);
                                setOpen(false);
                            }}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 cursor-pointer"
                        >
                            {p.image && (
                                <Image
                                    src={p.image}
                                    alt={p.name}
                                    width={40}
                                    height={40}
                                    className="rounded object-cover"
                                />
                            )}

                            <span className="text-white">{p.name}</span>
                        </div>
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
