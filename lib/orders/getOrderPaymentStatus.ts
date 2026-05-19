export function getOrderPaymentStatus(payments: any[]) {
    if (!payments?.length) return "pending";

    if (payments.every((p) => p.status === "paid")) {
        return "paid";
    }

    if (payments.some((p) => p.status === "paid")) {
        return "partial";
    }

    if (payments.some((p) => p.status === "failed")) {
        return "failed";
    }

    if (payments.some((p) => p.status === "refunded")) {
        return "refunded";
    }

    return "pending";
}
