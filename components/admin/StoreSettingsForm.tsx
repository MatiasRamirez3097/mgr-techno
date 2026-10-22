"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyPaymentSurcharge } from "@/lib/pricing";
import type { StoreSettingsDTO } from "@/types/shared/settings";

const EXAMPLE_PRICE = 100000;

export function StoreSettingsForm({
    initialSettings,
}: {
    initialSettings: StoreSettingsDTO;
}) {
    const router = useRouter();
    const [surcharge, setSurcharge] = useState(
        String(initialSettings.mercadoPagoSurchargePercent),
    );
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const parsedSurcharge = Number(surcharge);
    const isValid =
        surcharge.trim() !== "" &&
        Number.isFinite(parsedSurcharge) &&
        parsedSurcharge >= 0 &&
        parsedSurcharge <= 100;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mercadoPagoSurchargePercent: parsedSurcharge,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error guardando configuración");
            }

            setMessage({ type: "success", text: "Configuración guardada" });
            router.refresh();
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Error guardando configuración",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-6 flex flex-col gap-5"
        >
            <div>
                <h2 className="text-lg font-semibold text-white">Pagos</h2>
                <p className="text-sm text-gray-400 mt-1">
                    Recargo que se aplica sobre el precio final cuando el
                    cliente paga con Mercado Pago (tarjeta de crédito). Se usa
                    para el precio de lista que se muestra en la tienda y para
                    el monto que se cobra.
                </p>
            </div>

            <label className="flex flex-col gap-2">
                <span className="text-sm text-gray-300">
                    Recargo Mercado Pago (%)
                </span>
                <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={surcharge}
                    onChange={(e) => setSurcharge(e.target.value)}
                    className="w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand"
                />
            </label>

            {isValid ? (
                <p className="text-sm text-gray-400">
                    Ejemplo: un producto de $
                    {EXAMPLE_PRICE.toLocaleString("es-AR")} se cobra $
                    {applyPaymentSurcharge(
                        EXAMPLE_PRICE,
                        parsedSurcharge,
                    ).toLocaleString("es-AR")}{" "}
                    con Mercado Pago.
                </p>
            ) : (
                <p className="text-sm text-red-400">
                    Ingresá un número entre 0 y 100.
                </p>
            )}

            {message && (
                <p
                    className={`text-sm ${
                        message.type === "success"
                            ? "text-green-400"
                            : "text-red-400"
                    }`}
                >
                    {message.text}
                </p>
            )}

            <div>
                <button
                    type="submit"
                    disabled={!isValid || saving}
                    className="bg-brand hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg px-5 py-2 transition-opacity"
                >
                    {saving ? "Guardando..." : "Guardar"}
                </button>
            </div>
        </form>
    );
}
