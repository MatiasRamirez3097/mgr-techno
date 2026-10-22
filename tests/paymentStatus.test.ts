import { describe, expect, it } from "vitest";
import {
    computePaymentStatus,
    recalculateOrderPaymentStatus,
    sumPaidPayments,
} from "@/services/orders/recalculateOrderPaymentStatus";

describe("computePaymentStatus", () => {
    it("pending / partial / paid según el monto", () => {
        expect(computePaymentStatus(1000, 0)).toBe("pending");
        expect(computePaymentStatus(1000, 400)).toBe("partial");
        expect(computePaymentStatus(1000, 1000)).toBe("paid");
        expect(computePaymentStatus(1000, 1200)).toBe("paid");
    });
});

describe("sumPaidPayments", () => {
    it("suma sólo los pagos confirmados", () => {
        expect(
            sumPaidPayments([
                { status: "paid", amount: 300 },
                { status: "pending", amount: 500 },
                { status: "paid", amount: 200 },
            ]),
        ).toBe(500);
    });
});

describe("recalculateOrderPaymentStatus", () => {
    it("actualiza paidAmount, remainingAmount y datePaid", () => {
        const order: Record<string, unknown> = {
            total: 1000,
            payments: [{ status: "paid", amount: 400 }],
        };

        recalculateOrderPaymentStatus(order);
        expect(order.paymentStatus).toBe("partial");
        expect(order.paidAmount).toBe(400);
        expect(order.remainingAmount).toBe(600);
        expect(order.datePaid).toBeNull();

        (order.payments as { status: string; amount: number }[]).push({
            status: "paid",
            amount: 600,
        });
        recalculateOrderPaymentStatus(order);
        expect(order.paymentStatus).toBe("paid");
        expect(order.remainingAmount).toBe(0);
        expect(order.datePaid).toBeInstanceOf(Date);
    });

    it("conserva la fecha de pago original", () => {
        const datePaid = new Date("2026-01-01");
        const order: Record<string, unknown> = {
            total: 100,
            datePaid,
            payments: [{ status: "paid", amount: 100 }],
        };
        recalculateOrderPaymentStatus(order);
        expect(order.datePaid).toBe(datePaid);
    });
});
