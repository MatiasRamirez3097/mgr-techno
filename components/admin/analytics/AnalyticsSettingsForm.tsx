"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalyticsSettingsDTO } from "@/types/shared/settings";

export function AnalyticsSettingsForm({ initialSettings }: { initialSettings: AnalyticsSettingsDTO }) {
    const router = useRouter();
    const [digestEnabled, setDigestEnabled] = useState(initialSettings.analyticsDigestEnabled);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const dirty = digestEnabled !== initialSettings.analyticsDigestEnabled;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/admin/settings/analytics", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ analyticsDigestEnabled: digestEnabled }),
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
        <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-4 sm:p-6 flex flex-col gap-5"
        >
            <div>
                <h2 className="text-lg font-semibold text-white">Visitas</h2>
                <p className="text-sm text-gray-400 mt-1">Avisos de la medición de visitas de la tienda.</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={digestEnabled}
                    onChange={(e) => setDigestEnabled(e.target.checked)}
                    className="mt-1 h-5 w-5 accent-brand"
                />
                <span>
                    <span className="block text-sm text-gray-200">Resumen diario en Discord</span>
                    <span className="block text-sm text-gray-400 mt-0.5">
                        Todos los días a las 08:00: visitas de ayer, origen principal, pedidos, ofertas del día, lo
                        más agregado al carrito y lo que buscaron sin encontrar.
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
