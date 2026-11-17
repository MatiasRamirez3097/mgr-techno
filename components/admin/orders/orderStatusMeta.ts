/**
 * Estados de una orden para el panel: etiqueta, color y el flujo habitual (siguiente paso).
 * Archivo sin "use client" para poder usarlo tanto en páginas de servidor como en componentes.
 */

export const ORDER_STATUS_META: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendiente", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    processing: { label: "En proceso", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    on_hold: { label: "En espera", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
    ready_for_pickup: { label: "Listo para retirar", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
    shipped: { label: "Enviado", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
    completed: { label: "Completado", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    cancelled: { label: "Cancelado", color: "text-red-400 bg-red-400/10 border-red-400/20" },
    refunded: { label: "Reembolsado", color: "text-gray-400 bg-gray-400/10 border-gray-400/20" },
    failed: { label: "Fallido", color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

export const getOrderStatusMeta = (status: string) =>
    ORDER_STATUS_META[status] || { label: status, color: "text-gray-400 bg-gray-400/10 border-gray-400/20" };

// Estados que el servidor no deja usar sin el pago confirmado (salvo pago en efectivo).
// Debe coincidir con `advancedStates` de PUT /api/admin/orders/[id].
export const PAYMENT_REQUIRED_STATUSES = ["processing", "shipped", "ready_for_pickup", "completed"];

// Estados que disparan un email al cliente (PUT /api/admin/orders/[id])
export const EMAIL_STATUSES = ["shipped", "ready_for_pickup", "completed", "cancelled"];

// Estados que revierten stock o cierran la orden: piden confirmación
export const DESTRUCTIVE_STATUSES = ["cancelled", "refunded", "failed"];

/** Siguiente(s) paso(s) habituales según el estado actual y el método de envío. */
export function getNextOrderStatuses(status: string, shippingMethod?: string): string[] {
    switch (status) {
        case "pending":
        case "on_hold":
            return ["processing"];
        case "processing":
            if (shippingMethod === "local_pickup") return ["ready_for_pickup"];
            if (shippingMethod) return ["shipped"];
            return ["ready_for_pickup", "shipped"];
        case "ready_for_pickup":
        case "shipped":
            return ["completed"];
        default:
            return [];
    }
}

// Texto del botón de cada paso
export const NEXT_STEP_LABEL: Record<string, string> = {
    processing: "Pasar a En proceso",
    ready_for_pickup: "Marcar listo para retirar",
    shipped: "Marcar como enviado",
    completed: "Marcar como completado",
};
