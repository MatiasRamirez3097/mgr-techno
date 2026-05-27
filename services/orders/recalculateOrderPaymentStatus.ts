export function recalculateOrderPaymentStatus(order: any) {
    /*
    |------------------------------------------------------------------
    | PAID PAYMENTS
    |------------------------------------------------------------------
    */

    const paidPayments = order.payments.filter(
        (payment: any) => payment.status === "paid",
    );

    /*
    |------------------------------------------------------------------
    | TOTAL PAID
    |------------------------------------------------------------------
    */

    const totalPaid = paidPayments.reduce(
        (acc: number, payment: any) => acc + (payment.amount || 0),

        0,
    );

    /*
    |------------------------------------------------------------------
    | STATUS
    |------------------------------------------------------------------
    */

    if (totalPaid <= 0) {
        order.paymentStatus = "pending";

        order.datePaid = null;

        return;
    }

    if (totalPaid < order.total) {
        order.paymentStatus = "partial";

        order.datePaid = null;

        return;
    }

    order.paymentStatus = "paid";

    order.datePaid = new Date();
}
