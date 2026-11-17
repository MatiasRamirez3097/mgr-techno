"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES } from "@/constants/status";
import { buttonClass, cardClass, selectClass } from "@/components/admin/ui/styles";
import {
    DESTRUCTIVE_STATUSES,
    EMAIL_STATUSES,
    NEXT_STEP_LABEL,
    PAYMENT_REQUIRED_STATUSES,
    getNextOrderStatuses,
    getOrderStatusMeta,
} from "./orderStatusMeta";

interface Props {
    orderId: string;
    currentStatus: string;
    shippingMethod?: string;
    // Pago sin confirmar y sin pagos en efectivo: el servidor bloquea los estados de avance
    paymentBlocked: boolean;
}

/**
 * Estado de la orden en una sola fila: el estado actual, el siguiente paso habitual como botón y
 * "Otro estado" para el resto (cancelar, en espera, etc.). Reemplaza la lista de 9 opciones.
 */
export function OrderStatusControl({ orderId, currentStatus, shippingMethod, paymentBlocked }: Props) {
    const router = useRouter();
    const [status, setStatus] = useState(currentStatus);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showOther, setShowOther] = useState(false);
    const [other, setOther] = useState("");

    const meta = getOrderStatusMeta(status);
    const nextSteps = getNextOrderStatuses(status, shippingMethod);
    const isBlocked = (s: string) => paymentBlocked && PAYMENT_REQUIRED_STATUSES.includes(s);

    const changeStatus = async (target: string) => {
        if (target === status) return;
        const label = getOrderStatusMeta(target).label;

        if (isBlocked(target)) {
            setError(`No se puede pasar a "${label}" hasta que el pago esté confirmado.`);
            return;
        }

        const warnings = [`¿Cambiar el estado a "${label}"?`];
        if (target === "cancelled") warnings.push("Se devuelve el stock (o se revierte la asignación de inventario).");
        if (EMAIL_STATUSES.includes(target)) warnings.push("Se le envía un email al cliente.");
        // Pedir confirmación sólo cuando hay consecuencias además del cambio
        if ((DESTRUCTIVE_STATUSES.includes(target) || EMAIL_STATUSES.includes(target)) && !confirm(warnings.join("\n\n"))) {
            return;
        }

        setSaving(target);
        setError("");
        setSuccess("");
        try {
            const res = await fetch(`/api/admin/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: target }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "No se pudo cambiar el estado");
            setStatus(target);
            setSuccess(`Estado actualizado a "${label}"`);
            setShowOther(false);
            setOther("");
            router.refresh();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "No se pudo cambiar el estado");
        } finally {
            setSaving(null);
        }
    };

    const blockedNext = nextSteps.some(isBlocked);

    return (
        <section className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Estado</span>
                    <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                </div>

                <div className="flex flex-1 flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1">
                    {nextSteps.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => changeStatus(s)}
                            disabled={saving !== null || isBlocked(s)}
                            title={isBlocked(s) ? "Requiere el pago confirmado" : undefined}
                            className={buttonClass.primary}
                        >
                            {saving === s ? "Guardando..." : NEXT_STEP_LABEL[s] || getOrderStatusMeta(s).label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setShowOther((v) => !v)}
                        aria-expanded={showOther}
                        className={buttonClass.secondary}
                    >
                        Otro estado {showOther ? "▴" : "▾"}
                    </button>
                </div>
            </div>

            {blockedNext && (
                <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                    ⚠️ El pago no está confirmado: para avanzar (en proceso, listo, enviado o completado) primero
                    registrá el pago en la pestaña &ldquo;Pagos&rdquo;.
                </p>
            )}

            {showOther && (
                <div className="mt-3 flex flex-col gap-2 border-t border-gray-800 pt-3 sm:flex-row sm:items-center">
                    <label htmlFor="order-other-status" className="text-sm text-gray-400 sm:shrink-0">
                        Cambiar a
                    </label>
                    <select
                        id="order-other-status"
                        value={other}
                        onChange={(e) => setOther(e.target.value)}
                        className={`${selectClass} sm:max-w-xs`}
                    >
                        <option value="">Elegí un estado…</option>
                        {ORDER_STATUSES.filter((s) => s.value !== status).map((s) => (
                            <option key={s.value} value={s.value} disabled={isBlocked(s.value)}>
                                {s.label}
                                {isBlocked(s.value) ? " (requiere pago)" : ""}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => other && changeStatus(other)}
                        disabled={!other || saving !== null}
                        className={DESTRUCTIVE_STATUSES.includes(other) ? buttonClass.danger : buttonClass.secondary}
                    >
                        {saving === other ? "Guardando..." : "Aplicar"}
                    </button>
                </div>
            )}

            {(error || success) && (
                <p className={`mt-3 text-sm ${error ? "text-red-400" : "text-green-400"}`}>{error || success}</p>
            )}
        </section>
    );
}
