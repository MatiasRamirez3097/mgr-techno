export const ORDER_STATUSES = [
    { value: "pending", label: "Pendiente" },
    { value: "processing", label: "En proceso" },
    { value: "on_hold", label: "En espera" },
    { value: "ready_for_pickup", label: "Listo para retirar" },
    { value: "shipped", label: "Enviado" },
    { value: "completed", label: "Completado" },
    { value: "cancelled", label: "Cancelado" },
    { value: "refunded", label: "Reembolsado" },
];

export const ORDER_PAYMENT_STATUSES = [
    { value: "pending", label: "Pendiente" },
    { value: "paid", label: "Pagado" },
    { value: "failed", label: "Fallo" },
    { value: "refunded", label: "Devuelto" },
];
