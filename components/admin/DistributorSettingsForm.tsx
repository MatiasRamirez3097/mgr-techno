"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DistributorSettingsDTO } from "@/types/shared/settings";

export function DistributorSettingsForm({ initialSettings }: { initialSettings: DistributorSettingsDTO }) {
    const router = useRouter();
    const [applyIva, setApplyIva] = useState(initialSettings.pcmoddApplyIva);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const dirty = applyIva !== initialSettings.pcmoddApplyIva;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/settings/distributors", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pcmoddApplyIva: applyIva }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error guardando configuración");
            const recalculated: number | null = data.settings?.recalculated ?? null;
            setMessage({
                type: "success",
                text:
                    recalculated === null
                        ? "Configuración guardada"
                        : `Configuración guardada: se recalcularon ${recalculated} costos de PCMODD`,
            });
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
        <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-4 sm:p-6 flex flex-col gap-5"
        >
            <div>
                <h2 className="text-lg font-semibold text-white">Distribuidores</h2>
                <p className="text-sm text-gray-400 mt-1">
                    Cómo se calcula el costo de los distribuidores que pasan su lista en una planilla.
                </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={applyIva}
                    onChange={(e) => setApplyIva(e.target.checked)}
                    className="mt-1 h-5 w-5 accent-brand"
                />
                <span>
                    <span className="block text-sm text-gray-200">PCMODD: sumar el IVA de la columna C</span>
                    <span className="block text-sm text-gray-400 mt-0.5">
                        {applyIva
                            ? "El costo es el precio de la columna B más su IVA (ej: USD 100 con 21% = USD 121)."
                            : "El costo es el precio de la columna B tal cual, sin sumar IVA (ej: USD 100 = USD 100)."}{" "}
                        Al guardar se recalculan los costos ya cargados.
                    </span>
                </span>
            </label>

            {message && (
                <p className={`text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {message.text}
                </p>
            )}

            <div>
                <button
                    type="submit"
                    disabled={!dirty || saving}
                    className="w-full sm:w-auto min-h-10 bg-brand hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2 transition-opacity"
                >
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </div>
        </form>
    );
}
