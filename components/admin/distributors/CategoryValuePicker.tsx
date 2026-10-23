"use client";

import { useMemo, useState } from "react";
import type { DistributorCategoryOption } from "@/types/shared/comparatorCategory";

interface Props {
    options: DistributorCategoryOption[];
    selected: string[];
    onChange: (values: string[]) => void;
    // Compara un valor guardado con una opción (ej: NewBytes con guiones vs. espacios)
    normalize?: (value: string) => string;
    allowCustom?: boolean;
    emptyMessage?: string;
}

const defaultNormalize = (v: string) => v.trim().toLowerCase();

// Lista con buscador para elegir categorías de un distribuidor
export function CategoryValuePicker({
    options,
    selected,
    onChange,
    normalize = defaultNormalize,
    allowCustom = true,
    emptyMessage = "No hay categorías disponibles.",
}: Props) {
    const [filter, setFilter] = useState("");

    const selectedKeys = useMemo(() => new Set(selected.map(normalize)), [selected, normalize]);
    const labelFor = (value: string) =>
        options.find((o) => normalize(o.value) === normalize(value))?.label;

    const visible = useMemo(() => {
        const term = filter.trim().toLowerCase();
        if (!term) return options;
        return options.filter(
            (o) =>
                o.label.toLowerCase().includes(term) ||
                o.value.toLowerCase().includes(term) ||
                o.detail?.toLowerCase().includes(term),
        );
    }, [options, filter]);

    const toggle = (value: string) => {
        const key = normalize(value);
        onChange(
            selectedKeys.has(key)
                ? selected.filter((v) => normalize(v) !== key)
                : [...selected, value],
        );
    };

    const custom = filter.trim();
    const canAddCustom =
        allowCustom && custom !== "" && !selectedKeys.has(normalize(custom));

    return (
        <div className="space-y-2">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((value) => {
                        const label = labelFor(value);
                        return (
                            <span
                                key={value}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 border border-gray-700 text-xs text-gray-200"
                            >
                                {label && label !== value ? (
                                    <>
                                        {label} <span className="text-gray-500 font-mono">{value}</span>
                                    </>
                                ) : (
                                    value
                                )}
                                {!label && options.length > 0 && (
                                    <span className="text-amber-400" title="No figura en el listado del distribuidor">
                                        ⚠
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => toggle(value)}
                                    className="text-gray-500 hover:text-white"
                                    aria-label={`Quitar ${value}`}
                                >
                                    ✕
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-2">
                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={options.length > 0 ? "Buscar categoría..." : "Escribir categoría..."}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-brand"
                />
                {canAddCustom && (
                    <button
                        type="button"
                        onClick={() => {
                            onChange([...selected, custom]);
                            setFilter("");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 shrink-0"
                    >
                        + Agregar &quot;{custom}&quot;
                    </button>
                )}
            </div>

            {options.length === 0 ? (
                <p className="text-xs text-gray-500">{emptyMessage}</p>
            ) : (
                <ul className="max-h-44 overflow-y-auto rounded-lg border border-gray-800 divide-y divide-gray-800">
                    {visible.map((o) => (
                        <li key={o.value}>
                            <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800/60 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedKeys.has(normalize(o.value))}
                                    onChange={() => toggle(o.value)}
                                    className="accent-brand"
                                />
                                <span className="truncate">{o.label}</span>
                                {o.detail && (
                                    <span className="ml-auto text-xs text-gray-500 shrink-0">{o.detail}</span>
                                )}
                            </label>
                        </li>
                    ))}
                    {visible.length === 0 && (
                        <li className="px-3 py-2 text-xs text-gray-500">Sin coincidencias.</li>
                    )}
                </ul>
            )}
        </div>
    );
}
