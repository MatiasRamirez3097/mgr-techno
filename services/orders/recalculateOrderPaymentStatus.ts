export type OrderPaymentStatus = "pending" | "partial" | "paid";

/**
 * Estado de pago según el monto cobrado. Única regla usada por pedidos
 * de ecommerce, pedidos manuales, el webhook de MP y los endpoints de pagos.
 */
export function computePaymentStatus(
    total: number,
    paidAmount: number,
): OrderPaymentStatus {
    if (paidAmount <= 0) return "pending";
    if (paidAmount < total) return "partial";
    return "paid";
}

export function sumPaidPayments(
    payments: { status?: string; amount?: number }[] = [],
) {
    return payments
        .filter((payment) => payment.status === "paid")
        .reduce((acc, payment) => acc + (payment.amount || 0), 0);
}

/**
 * Recalcula paymentStatus, paidAmount, remainingAmount y datePaid
 * a partir de los pagos del pedido (muta el documento).
 */
export function recalculateOrderPaymentStatus(order: any) {
    const totalPaid = sumPaidPayments(order.payments);

    order.paymentStatus = computePaymentStatus(order.total, totalPaid);
    order.paidAmount = totalPaid;
    order.remainingAmount = Math.max(0, order.total - totalPaid);

    if (order.paymentStatus === "paid") {
        // Conserva la fecha original si ya estaba pagado
        order.datePaid = order.datePaid || new Date();
    } else {
        order.datePaid = null;
    }
}

/**
 * Un pedido que queda pagado pasa de "pending" a "processing".
 * Mismo criterio en el webhook de MP y en los endpoints de pagos del admin.
 */
export function advanceOrderStatusIfPaid(order: any) {
    if (order.paymentStatus === "paid" && order.status === "pending") {
        order.status = "processing";
    }
}
