"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/admin/ui/styles";
import { confirmOrderStatus, saveOrderStatus } from "./OrderStatusControl";
import { NEXT_STEP_LABEL, PAYMENT_REQUIRED_STATUSES, getNextOrderStatuses, getOrderStatusMeta } from "./orderStatusMeta";

interface Props {
    orderId: string;
    status: string;
    shippingMethod?: string;
    paymentBlocked: boolean;
}

/**
 * Botón chico del listado de órdenes: avanza la orden al siguiente paso habitual sin entrar al
 * detalle. Sin siguiente paso (completada, cancelada…) no muestra nada.
 */
export function OrderNextStepButton({ orderId, status, shippingMethod, paymentBlocked }: Props) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Con dos opciones posibles (envío desconocido) se deja elegir en el detalle
    const next = getNextOrderStatuses(status, shippingMethod);
    if (next.length !== 1) return null;
    const target = next[0];
    const blocked = paymentBlocked && PAYMENT_REQUIRED_STATUSES.includes(target);

    const run = async (e: React.MouseEvent) => {
        // La tarjeta del celular es un link: que el botón no navegue
        e.preventDefault();
        e.stopPropagation();
        const message = confirmOrderStatus(target);
        if (message && !confirm(message)) return;
        setSaving(true);
        setError("");
        try {
            await saveOrderStatus(orderId, target);
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "No se pudo cambiar el estado");
        } finally {
            setSaving(false);
        }
    };

    return (
        <span className="relative z-10 inline-flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={run}
                disabled={saving || blocked}
                title={blocked ? "Requiere el pago confirmado" : `Pasar a "${getOrderStatusMeta(target).label}"`}
                className={`${buttonClass.secondary} min-h-8 whitespace-nowrap px-3 py-1 text-xs`}
            >
                {saving ? "Guardando..." : `${NEXT_STEP_LABEL[target] || getOrderStatusMeta(target).label} →`}
            </button>
            {blocked && <span className="text-[11px] text-amber-300">Falta el pago</span>}
            {error && <span className="max-w-56 text-right text-[11px] text-red-400">{error}</span>}
        </span>
    );
}
