"use client";

import { useState, useRef, useEffect, useMemo } from "react";

export interface SearchableOption {
    value: string;
    label: string;
    sublabel?: string;
    badge?: string;
    searchText?: string;
}

interface SearchableEntitySelectProps {
    options: SearchableOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    disabled?: boolean;
    clearable?: boolean;
    className?: string;
}

function normalizeForMatch(text: string): string {
    return (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export function SearchableEntitySelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    searchPlaceholder = "Buscar por nombre, apellido o documento...",
    emptyText = "No se encontraron resultados",
    disabled = false,
    clearable = true,
    className = "",
}: SearchableEntitySelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Ensure options are sorted alphabetically by label
    const sortedOptions = useMemo(() => {
        return [...options].sort((a, b) =>
            (a.label || "").localeCompare(b.label || "", "es", {
                sensitivity: "base",
            }),
        );
    }, [options]);

    const selectedOption = useMemo(
        () => sortedOptions.find((o) => o.value === value) || null,
        [sortedOptions, value],
    );

    const filteredOptions = useMemo(() => {
        const normalizedQuery = normalizeForMatch(search);
        if (!normalizedQuery) return sortedOptions;

        const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
        return sortedOptions.filter((opt) => {
            const haystack = normalizeForMatch(
                `${opt.label} ${opt.sublabel || ""} ${opt.badge || ""} ${opt.searchText || ""}`,
            );
            // Also allow matching document numbers without dashes/dots
            const compactHaystack = haystack.replace(/[-.]/g, "");
            return tokens.every((token) => {
                const compactToken = token.replace(/[-.]/g, "");
                return (
                    haystack.includes(token) ||
                    (compactToken.length >= 3 &&
                        compactHaystack.includes(compactToken))
                );
            });
        });
    }, [sortedOptions, search]);

    useEffect(() => {
        setHighlightedIndex(0);
    }, [search, open]);

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 10);
        } else {
            setSearch("");
        }
    }, [open]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        onChange(val);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!open) {
            if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                filteredOptions.length > 0
                    ? Math.min(prev + 1, filteredOptions.length - 1)
                    : 0,
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const item = filteredOptions[highlightedIndex];
            if (item) {
                handleSelect(item.value);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    };

    useEffect(() => {
        if (!open || !listRef.current) return;
        const activeEl = listRef.current.querySelector(
            `[data-idx="${highlightedIndex}"]`,
        ) as HTMLElement | null;
        if (activeEl) {
            activeEl.scrollIntoView({ block: "nearest" });
        }
    }, [highlightedIndex, open]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full ${className}`}
            onKeyDown={handleKeyDown}
        >
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                    if (!disabled) setOpen((prev) => !prev);
                }}
                className={`w-full bg-gray-800 text-sm rounded-lg px-4 py-3 border transition-colors flex items-center justify-between gap-2 select-none ${
                    disabled
                        ? "opacity-60 cursor-not-allowed border-gray-700 text-gray-400"
                        : open
                          ? "border-brand text-white cursor-pointer"
                          : "border-gray-700 hover:border-gray-600 text-white cursor-pointer"
                }`}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {selectedOption ? (
                        <div className="flex items-center gap-2 min-w-0 truncate">
                            <span className="text-white font-medium truncate">
                                {selectedOption.label}
                            </span>
                            {selectedOption.badge && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300 shrink-0">
                                    {selectedOption.badge}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-gray-400 truncate">
                            {placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {clearable && selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange("");
                                setOpen(false);
                            }}
                            title="Limpiar selección"
                            className="text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-gray-700 text-xs transition-colors"
                        >
                            ✕
                        </button>
                    )}
                    <span className="text-gray-400 text-xs">
                        {open ? "▲" : "▼"}
                    </span>
                </div>
            </div>

            {open && !disabled && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-2 border-b border-gray-800 bg-gray-900/95">
                        <div className="relative">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full bg-gray-800 text-white text-sm rounded-lg pl-3 pr-8 py-2 border border-gray-700 focus:border-brand outline-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        searchInputRef.current?.focus();
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    <div
                        ref={listRef}
                        className="max-h-64 overflow-y-auto divide-y divide-gray-800/60"
                    >
                        {clearable && !search && (
                            <button
                                type="button"
                                onClick={() => handleSelect("")}
                                className={`w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-800 transition-colors ${
                                    !value ? "bg-gray-800/50 font-medium" : ""
                                }`}
                            >
                                — {placeholder} —
                            </button>
                        )}

                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">
                                {emptyText}
                            </div>
                        ) : (
                            filteredOptions.map((opt, idx) => {
                                const isSelected = opt.value === value;
                                const isHighlighted = idx === highlightedIndex;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        data-idx={idx}
                                        onMouseEnter={() =>
                                            setHighlightedIndex(idx)
                                        }
                                        onClick={() => handleSelect(opt.value)}
                                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-3 transition-colors ${
                                            isHighlighted
                                                ? "bg-gray-800 text-white"
                                                : isSelected
                                                  ? "bg-brand/10 text-white"
                                                  : "text-gray-200 hover:bg-gray-800/60"
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium truncate">
                                                {opt.label}
                                            </div>
                                            {opt.sublabel && (
                                                <div className="text-xs text-gray-400 truncate mt-0.5">
                                                    {opt.sublabel}
                                                </div>
                                            )}
                                        </div>

                                        {opt.badge && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 shrink-0">
                                                {opt.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
