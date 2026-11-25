"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, cardClass, hintClass, inputClass, labelClass } from "@/components/admin/ui/styles";
import { ROTATION_LIMITS, rotationSettingsSchema } from "@/lib/validators/storeSettingsSchema";
import type { RotationSettingsDTO } from "@/types/shared/stockRotation";

type NumberField = Exclude<keyof RotationSettingsDTO, "rotationRestockEnabled">;

const NUMBER_FIELDS: { key: NumberField; label: string; hint: string; suffix: string }[] = [
    {
        key: "rotationSalesWindowDays",
        label: "Ventana de ventas",
        hint: "Días hacia atrás que se miran para calcular el ritmo de venta.",
        suffix: "días",
    },
    {
        key: "rotationSlowCoverageDays",
        label: "Stock lento",
        hint: "Se marca si al ritmo actual el stock dura más que esto (o si no se vendió en ese tiempo).",
        suffix: "días",
    },
    {
        key: "rotationOldStockDays",
        label: "Stock viejo",
        hint: "Se marca si hay unidades que entraron hace más que esto.",
        suffix: "días",
    },
    {
        key: "rotationCheaperReplacementPercent",
        label: "Reposición más barata",
        hint: "Se marca si el distribuidor hoy lo vende al menos este % más barato que lo que pagaste.",
        suffix: "%",
    },
];

export function RotationSettingsForm({ initialSettings }: { initialSettings: RotationSettingsDTO }) {
    const router = useRouter();
    const [values, setValues] = useState(initialSettings);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const dirty = (Object.keys(values) as (keyof RotationSettingsDTO)[]).some(
        (k) => values[k] !== initialSettings[k],
    );

    const setNumber = (key: NumberField, raw: string) =>
        setValues((v) => ({ ...v, [key]: raw === "" ? Number.NaN : Number(raw) }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        // Mismo esquema que el servidor: los errores salen en castellano antes de enviar
        const parsed = rotationSettingsSchema.safeParse(values);
        if (!parsed.success) {
            setMessage({ type: "error", text: parsed.error.issues[0]?.message ?? "Valores inválidos" });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings/rotation", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed.data),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error guardando configuración");
            setMessage({ type: "success", text: "Configuración guardada" });
            router.refresh();
        } catch (error) {
            setMessage({
                type: "error",
                text: error instanceof Error ? error.message : "Error guardando configuración",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`${cardClass} p-4 sm:p-6 flex flex-col gap-5`}>
            <div>
                <h2 className="text-lg font-semibold text-white">Stock a rotar</h2>
                <p className="text-sm text-gray-400 mt-1">
                    Cuándo un producto aparece en <span className="text-gray-200">Productos › Stock a rotar</span>.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {NUMBER_FIELDS.map((f) => (
                    <div key={f.key}>
                        <label htmlFor={f.key} className={labelClass}>
                            {f.label}
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id={f.key}
                                type="number"
                                inputMode={f.key === "rotationCheaperReplacementPercent" ? "decimal" : "numeric"}
                                min={ROTATION_LIMITS[f.key].min}
                                max={ROTATION_LIMITS[f.key].max}
                                step={f.key === "rotationCheaperReplacementPercent" ? "any" : 1}
                                value={Number.isNaN(values[f.key]) ? "" : values[f.key]}
                                onChange={(e) => setNumber(f.key, e.target.value)}
                                className={inputClass}
                            />
                            <span className="text-sm text-gray-400 shrink-0">{f.suffix}</span>
                        </div>
                        <p className={hintClass}>{f.hint}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-800 pt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={values.rotationRestockEnabled}
                        onChange={(e) => setValues((v) => ({ ...v, rotationRestockEnabled: e.target.checked }))}
                        className="mt-1 h-5 w-5 accent-brand"
                    />
                    <span>
                        <span className="block text-sm text-gray-200">Mostrar también lo que conviene reponer</span>
                        <span className="block text-sm text-gray-400 mt-0.5">
                            Productos que se venden y les queda stock para pocos días (o ya se agotaron), con stock
                            en algún distribuidor.
                        </span>
                    </span>
                </label>
                {values.rotationRestockEnabled && (
                    <div className="sm:max-w-[calc(50%-0.5rem)]">
                        <label htmlFor="rotationRestockCoverageDays" className={labelClass}>
                            Reponer si el stock dura menos de
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id="rotationRestockCoverageDays"
                                type="number"
                                inputMode="numeric"
                                min={ROTATION_LIMITS.rotationRestockCoverageDays.min}
                                max={ROTATION_LIMITS.rotationRestockCoverageDays.max}
                                step={1}
                                value={
                                    Number.isNaN(values.rotationRestockCoverageDays)
                                        ? ""
                                        : values.rotationRestockCoverageDays
                                }
                                onChange={(e) => setNumber("rotationRestockCoverageDays", e.target.value)}
                                className={inputClass}
                            />
                            <span className="text-sm text-gray-400 shrink-0">días</span>
                        </div>
                    </div>
                )}
            </div>

            {message && (
                <p className={`text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {message.text}
                </p>
            )}

            <div>
                <button type="submit" disabled={!dirty || saving} className={`${buttonClass.primary} w-full sm:w-auto`}>
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </div>
        </form>
    );
}
