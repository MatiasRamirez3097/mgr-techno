"use client";

import { useRouter } from "next/navigation";
import { ORDER_STATUSES } from "@/constants/status";
import { StatusControl } from "@/components/admin/ui/StatusControl";
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
    className?: string;
}

/** Guarda el cambio de estado de una orden; devuelve el error del servidor si lo rechaza. */
export async function saveOrderStatus(orderId: string, status: string) {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo cambiar el estado");
}

/** Mensaje de confirmación para los cambios con consecuencias (stock, email al cliente). */
export function confirmOrderStatus(status: string): string | null {
    if (!DESTRUCTIVE_STATUSES.includes(status) && !EMAIL_STATUSES.includes(status)) return null;
    const lines = [`¿Cambiar el estado a "${getOrderStatusMeta(status).label}"?`];
    if (status === "cancelled") lines.push("Se devuelve el stock (o se revierte la asignación de inventario).");
    if (EMAIL_STATUSES.includes(status)) lines.push("Se le envía un email al cliente.");
    return lines.join("\n\n");
}

/** Estado de una orden: siguiente paso habitual según el envío y "Otro estado" para el resto. */
export function OrderStatusControl({ orderId, currentStatus, shippingMethod, paymentBlocked, className }: Props) {
    const router = useRouter();
    const isBlocked = (s: string) => paymentBlocked && PAYMENT_REQUIRED_STATUSES.includes(s);
    const blockedNext = getNextOrderStatuses(currentStatus, shippingMethod).some(isBlocked);

    return (
        <StatusControl
            className={className}
            status={currentStatus}
            meta={getOrderStatusMeta}
            options={ORDER_STATUSES}
            isBlocked={isBlocked}
            nextSteps={(s) =>
                getNextOrderStatuses(s, shippingMethod).map((next) => ({
                    key: next,
                    status: next,
                    label: NEXT_STEP_LABEL[next] || getOrderStatusMeta(next).label,
                    title: isBlocked(next) ? "Requiere el pago confirmado" : undefined,
                }))
            }
            confirmFor={confirmOrderStatus}
            onChange={async (s) => {
                await saveOrderStatus(orderId, s);
                router.refresh();
            }}
            notice={
                blockedNext && (
                    <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
                        ⚠️ El pago no está confirmado: para avanzar (en proceso, listo, enviado o completado) primero
                        registrá el pago en la pestaña &ldquo;Pagos&rdquo;.
                    </p>
                )
            }
        />
    );
}
