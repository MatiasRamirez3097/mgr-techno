"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

export interface ProductOption {
    id: string;
    name: string;
    sku?: string;
    type?: "simple" | "bundle";
    status?: string;
    regularPrice: number;
    salePrice?: number;
    effectivePrice?: number;
    availableStock?: number;
    taxRate: number;
    image?: string | null;
}

interface Props {
    value: ProductOption | null;
    statusAll?: boolean;
    excludeBundles?: boolean;
    disabled?: boolean;
    placeholder?: string;
    onChange: (product: ProductOption | null) => void;
}

export function ProductSelector({
    value,
    onChange,
    disabled = false,
    statusAll = false,
    excludeBundles = false,
    placeholder = "Buscar producto por nombre, palabras clave o SKU...",
}: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ProductOption[]>([]);
    const [open, setOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setIsSearching(false);
                setQuery("");
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Debounced search
    useEffect(() => {
        const trimmed = query.trim();
        setHighlightedIndex(0);

        if (trimmed.length < 2) {
            setResults([]);
            setOpen(false);
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    q: trimmed,
                    admin: "true",
                });
                if (statusAll) params.set("statusAll", "true");
                if (excludeBundles) params.set("excludeBundles", "true");

                const res = await fetch(
                    `/api/products/search?${params.toString()}`,
                    {
                        signal: controller.signal,
                    },
                );

                if (!res.ok) throw new Error();

                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
                setOpen(true);
            } catch (e: any) {
                if (e.name !== "AbortError") {
                    setResults([]);
                }
            } finally {
                setLoading(false);
            }
        }, 220);

        return () => {
            controller.abort();
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, statusAll, excludeBundles]);

    useEffect(() => {
        if (!open || !listRef.current) return;
        const activeEl = listRef.current.querySelector(
            `[data-idx="${highlightedIndex}"]`,
        ) as HTMLElement | null;
        if (activeEl) {
            activeEl.scrollIntoView({ block: "nearest" });
        }
    }, [highlightedIndex, open]);

    const handleSelect = (product: ProductOption) => {
        onChange(product);
        setQuery("");
        setOpen(false);
        setIsSearching(false);
    };

    const handleStartEditing = () => {
        if (disabled) return;
        setIsSearching(true);
        setQuery("");
        setTimeout(() => {
            inputRef.current?.focus();
        }, 10);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setIsSearching(false);
            setQuery("");
            return;
        }

        if (!open || results.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                Math.min(prev + 1, results.length - 1),
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const chosen = results[highlightedIndex];
            if (chosen) {
                handleSelect(chosen);
            }
        }
    };

    const getEffectivePrice = (p: ProductOption) => {
        if (typeof p.effectivePrice === "number" && p.effectivePrice > 0) {
            return p.effectivePrice;
        }
        if (typeof p.salePrice === "number" && p.salePrice > 0) {
            return p.salePrice;
        }
        return Number(p.regularPrice) || 0;
    };

    const showSelectedCard = Boolean(value && value.id && !isSearching);

    return (
        <div ref={containerRef} className="relative w-full">
            {showSelectedCard && value ? (
                <div
                    onClick={handleStartEditing}
                    className={`w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 flex items-center justify-between gap-2 transition-colors ${
                        disabled
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:border-brand cursor-pointer"
                    }`}
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {value.image ? (
                            <div className="relative w-8 h-8 rounded bg-gray-900 overflow-hidden shrink-0 border border-gray-700">
                                <Image
                                    src={value.image}
                                    alt={value.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : null}

                        <div className="min-w-0 flex-1">
                            <div className="font-medium text-white truncate">
                                {value.name}
                            </div>
                            <div className="flex items-center flex-wrap gap-2 text-xs text-gray-400 mt-0.5">
                                {value.sku && (
                                    <span className="font-mono text-gray-300">
                                        SKU: {value.sku}
                                    </span>
                                )}
                                {typeof value.availableStock === "number" && (
                                    <span
                                        className={
                                            value.availableStock > 0
                                                ? "text-green-400"
                                                : "text-red-400"
                                        }
                                    >
                                        • Stock: {value.availableStock} u.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {!disabled && (
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditing();
                                }}
                                title="Buscar otro producto"
                                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                            >
                                Cambiar
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(null);
                                    setQuery("");
                                }}
                                title="Quitar producto"
                                className="text-xs text-gray-400 hover:text-red-400 px-1.5 py-1 rounded hover:bg-gray-700 transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        disabled={disabled}
                        value={query}
                        placeholder={
                            value?.name
                                ? `Reemplazar: ${value.name}...`
                                : placeholder
                        }
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (results.length > 0) setOpen(true);
                        }}
                        className="w-full bg-gray-800 text-white text-sm rounded-lg pl-3 pr-9 py-2.5 border border-gray-700 focus:border-brand outline-none transition-colors"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {loading ? (
                            <span className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin inline-block" />
                        ) : query ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery("");
                                    setResults([]);
                                    setOpen(false);
                                    inputRef.current?.focus();
                                }}
                                className="text-gray-400 hover:text-white text-xs px-1"
                            >
                                ✕
                            </button>
                        ) : value ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSearching(false);
                                    setQuery("");
                                    setOpen(false);
                                }}
                                title="Cancelar cambio"
                                className="text-gray-400 hover:text-white text-xs px-1"
                            >
                                ✕
                            </button>
                        ) : null}
                    </div>
                </div>
            )}

            {open && !disabled && (
                <div
                    ref={listRef}
                    className="absolute z-50 left-0 right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-gray-800/70"
                >
                    {results.length > 0 ? (
                        results.map((p, idx) => {
                            const effPrice = getEffectivePrice(p);
                            const stock = Number(p.availableStock) || 0;
                            const isHighlighted = idx === highlightedIndex;

                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    data-idx={idx}
                                    onMouseEnter={() =>
                                        setHighlightedIndex(idx)
                                    }
                                    onClick={() => handleSelect(p)}
                                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                                        isHighlighted
                                            ? "bg-gray-800"
                                            : "hover:bg-gray-800/60"
                                    }`}
                                >
                                    <div className="w-10 h-10 relative bg-gray-800 rounded-lg overflow-hidden shrink-0 border border-gray-700">
                                        {p.image ? (
                                            <Image
                                                src={p.image}
                                                alt={p.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                                                Sin img
                                            </div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-white line-clamp-1">
                                            {p.name}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                                            {p.sku && (
                                                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300">
                                                    SKU: {p.sku}
                                                </span>
                                            )}
                                            {p.type === "bundle" && (
                                                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                                    📦 Combo
                                                </span>
                                            )}
                                            {p.status &&
                                                p.status !== "publish" && (
                                                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                        {p.status ===
                                                        "pending_review"
                                                            ? "En revisión"
                                                            : p.status ===
                                                                "draft"
                                                              ? "Borrador"
                                                              : "Privado"}
                                                    </span>
                                                )}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                        {effPrice > 0 && (
                                            <span className="text-xs font-semibold text-white">
                                                $
                                                {effPrice.toLocaleString(
                                                    "es-AR",
                                                )}
                                            </span>
                                        )}
                                        <span
                                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                                stock > 0
                                                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                            }`}
                                        >
                                            {stock > 0
                                                ? `${stock} disp.`
                                                : "Sin stock"}
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    ) : !loading && query.trim().length >= 2 ? (
                        <div className="px-4 py-4 text-sm text-gray-400 text-center">
                            No se encontraron productos que coincidan con &ldquo;
                            {query.trim()}&rdquo;
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
