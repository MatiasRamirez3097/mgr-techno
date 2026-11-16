"use client";

import { useMemo, useState } from "react";
import { StickyActionBar } from "@/components/admin/ui/StickyActionBar";
import { buttonClass } from "@/components/admin/ui/styles";
import { useRouter } from "next/navigation";
import { resolveMargins, suggestPrice, type CategoryMarginNode } from "@/lib/priceReview";
import type { PricingSettingsDTO } from "@/types/shared/settings";
import type { CategoryMarginDTO } from "@/types/shared/priceReview";

interface Props {
    settings: PricingSettingsDTO;
    categories: CategoryMarginDTO[];
}

type Draft = Record<string, { target: string; min: string }>;

const inputClass =
    "w-20 sm:w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 sm:py-1.5 text-sm text-white font-mono text-right outline-none focus:border-brand";

const toNumberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));
const toInput = (value: number | null) => (value === null ? "" : String(value));

export function PricingMarginsForm({ settings, categories }: Props) {
    const router = useRouter();
    const [general, setGeneral] = useState({
        target: String(settings.targetMarginPercent),
        min: String(settings.minMarginPercent),
        step: String(settings.priceRoundingStep),
    });
    const [draft, setDraft] = useState<Draft>(() =>
        Object.fromEntries(
            categories.map((c) => [c.id, { target: toInput(c.targetMarginPercent), min: toInput(c.minMarginPercent) }]),
        ),
    );
    const [filter, setFilter] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const generalValues = {
        targetMarginPercent: Number(general.target),
        minMarginPercent: Number(general.min),
        priceRoundingStep: Number(general.step),
    };
    const generalValid =
        general.target.trim() !== "" &&
        general.min.trim() !== "" &&
        generalValues.targetMarginPercent >= 0 &&
        generalValues.minMarginPercent >= 0 &&
        generalValues.minMarginPercent <= generalValues.targetMarginPercent &&
        Number.isInteger(generalValues.priceRoundingStep) &&
        generalValues.priceRoundingStep >= 1;

    // Márgenes efectivos con lo que está escrito (herencia incluida), para mostrarlos al lado
    const nodes = useMemo(
        () =>
            new Map<string, CategoryMarginNode>(
                categories.map((c) => [
                    c.id,
                    {
                        id: c.id,
                        name: c.name,
                        parentId: c.parentId,
                        targetMarginPercent: toNumberOrNull(draft[c.id]?.target ?? ""),
                        minMarginPercent: toNumberOrNull(draft[c.id]?.min ?? ""),
                    },
                ]),
            ),
        [categories, draft],
    );

    const changed = categories.filter(
        (c) =>
            toNumberOrNull(draft[c.id].target) !== c.targetMarginPercent ||
            toNumberOrNull(draft[c.id].min) !== c.minMarginPercent,
    );

    const invalidCategory = categories.find((c) => {
        const t = toNumberOrNull(draft[c.id].target);
        const m = toNumberOrNull(draft[c.id].min);
        return (t !== null && (t < 0 || Number.isNaN(t))) || (m !== null && (m < 0 || Number.isNaN(m))) || (t !== null && m !== null && m > t);
    });

    async function save() {
        if (!generalValid || invalidCategory) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/pricing/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(generalValues),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error guardando márgenes generales");

            if (changed.length > 0) {
                const resCat = await fetch("/api/admin/pricing/category-margins", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        categories: changed.map((c) => ({
                            id: c.id,
                            targetMarginPercent: toNumberOrNull(draft[c.id].target),
                            minMarginPercent: toNumberOrNull(draft[c.id].min),
                        })),
                    }),
                });
                const dataCat = await resCat.json();
                if (!resCat.ok) throw new Error(dataCat.error || "Error guardando márgenes por categoría");
            }

            setMessage({ type: "success", text: "Márgenes guardados" });
            router.refresh();
        } catch (err) {
            setMessage({ type: "error", text: err instanceof Error ? err.message : "Error guardando márgenes" });
        } finally {
            setSaving(false);
        }
    }

    const visible = filter.trim()
        ? categories.filter((c) => c.name.toLowerCase().includes(filter.trim().toLowerCase()))
        : categories;

    return (
        <div className="space-y-6">
            {/* Generales */}
            <section className="bg-gray-900 rounded-2xl border border-gray-800 p-4 sm:p-6 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Márgenes generales</h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Margen sobre el costo del distribuidor (con IVA). Se usa para las categorías que no definen el suyo.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-6">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-gray-300">Margen objetivo (%)</span>
                        <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={general.target}
                            onChange={(e) => setGeneral((g) => ({ ...g, target: e.target.value }))}
                            className={inputClass}
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-gray-300">Margen mínimo (%)</span>
                        <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={general.min}
                            onChange={(e) => setGeneral((g) => ({ ...g, min: e.target.value }))}
                            className={inputClass}
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-gray-300">Redondear sugeridos a ($)</span>
                        <input
                            type="number"
                            min={1}
                            step={1}
                            value={general.step}
                            onChange={(e) => setGeneral((g) => ({ ...g, step: e.target.value }))}
                            className={inputClass}
                        />
                    </label>
                </div>
                {generalValid ? (
                    <p className="text-sm text-gray-400">
                        Ejemplo: con un costo de $100.000 se sugiere $
                        {suggestPrice(100000, generalValues.targetMarginPercent, generalValues.priceRoundingStep).toLocaleString(
                            "es-AR",
                        )}
                        ; por debajo de $
                        {Math.round(100000 * (1 + generalValues.minMarginPercent / 100)).toLocaleString("es-AR")} se marca
                        como bajo el mínimo.
                    </p>
                ) : (
                    <p className="text-sm text-red-400">
                        Revisá los valores: el mínimo no puede superar al objetivo y el redondeo debe ser un entero mayor a 0.
                    </p>
                )}
            </section>

            {/* Por categoría */}
            <section className="bg-gray-900 rounded-2xl border border-gray-800 p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Márgenes por categoría</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Vacío = hereda de la categoría superior o usa el general. Si un producto está en varias categorías,
                            se usa la primera que tenga margen.
                        </p>
                    </div>
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Filtrar categorías…"
                        className="w-full sm:w-64 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-brand"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-gray-400 border-b border-gray-800">
                            <tr>
                                <th className="text-left py-2 font-semibold">Categoría</th>
                                <th className="text-right py-2 font-semibold">
                                    Objetivo <span className="max-sm:hidden">(%)</span>
                                </th>
                                <th className="text-right py-2 pl-2 font-semibold">
                                    Mínimo <span className="max-sm:hidden">(%)</span>
                                </th>
                                <th className="hidden sm:table-cell text-right py-2 font-semibold">Efectivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {visible.map((c) => {
                                const effective = resolveMargins([c.id], nodes, generalValues);
                                const values = draft[c.id];
                                return (
                                    <tr key={c.id}>
                                        <td className="py-2 pr-2 text-gray-200" style={{ paddingLeft: filter ? 0 : Math.min(c.depth, 4) * 14 }}>
                                            {c.depth > 0 && !filter && <span className="text-gray-600 mr-1">└</span>}
                                            {c.name}
                                            {/* En el celular el margen efectivo va debajo del nombre */}
                                            <span className="sm:hidden block text-[11px] text-gray-500">
                                                Efectivo {effective.targetMarginPercent}% / {effective.minMarginPercent}%
                                                {effective.targetSource && effective.targetSource !== c.name && ` (de ${effective.targetSource})`}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right">
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.5}
                                                value={values.target}
                                                onChange={(e) =>
                                                    setDraft((d) => ({ ...d, [c.id]: { ...d[c.id], target: e.target.value } }))
                                                }
                                                placeholder="—"
                                                className={inputClass}
                                            />
                                        </td>
                                        <td className="py-2 pl-2 text-right">
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.5}
                                                value={values.min}
                                                onChange={(e) =>
                                                    setDraft((d) => ({ ...d, [c.id]: { ...d[c.id], min: e.target.value } }))
                                                }
                                                placeholder="—"
                                                className={inputClass}
                                            />
                                        </td>
                                        <td
                                            className="hidden sm:table-cell py-2 text-right text-xs text-gray-400 whitespace-nowrap"
                                            title={effective.targetSource ? `Objetivo de ${effective.targetSource}` : "Objetivo general"}
                                        >
                                            {effective.targetMarginPercent}% / {effective.minMarginPercent}%
                                            {effective.targetSource && effective.targetSource !== c.name && (
                                                <span className="block text-[10px] text-gray-500">de {effective.targetSource}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* "Guardar" siempre a mano: la lista de categorías es larga */}
            <StickyActionBar
                info={
                    invalidCategory ? (
                        <span className="text-red-400">
                            Revisá &quot;{invalidCategory.name}&quot;: el mínimo no puede superar al objetivo.
                        </span>
                    ) : message ? (
                        <span className={message.type === "success" ? "text-green-400" : "text-red-400"}>{message.text}</span>
                    ) : null
                }
            >
                <button
                    type="button"
                    onClick={save}
                    disabled={saving || !generalValid || Boolean(invalidCategory)}
                    className={buttonClass.primary}
                >
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </StickyActionBar>
        </div>
    );
}
