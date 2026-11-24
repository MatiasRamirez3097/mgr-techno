import { describe, expect, it } from "vitest";
import { buildOrderFromPendingSales } from "@/lib/pendingSales/buildOrderFromPendingSales";

const sale = (overrides: Partial<Parameters<typeof buildOrderFromPendingSales>[0][number]> = {}) => ({
    id: "s1",
    productId: "p1",
    productName: "Pasta térmica MX-4",
    quantity: 2,
    createdAt: new Date("2026-11-20T15:00:00-03:00"),
    ...overrides,
});

describe("buildOrderFromPendingSales", () => {
    it("usa la cantidad escaneada y el precio elegido", () => {
        const order = buildOrderFromPendingSales([sale()], {
            unitPrices: { s1: 5000 },
            paymentMethod: "cash",
            paid: true,
        });
        expect(order.items).toEqual([
            expect.objectContaining({ productId: "p1", quantity: 2, unitPrice: 5000, taxRate: 10.5 }),
        ]);
        expect(order.total).toBe(10000);
        expect(order.status).toBe("completed");
        expect(order.shippingMethod).toEqual({ method: "local_pickup", cost: 0 });
    });

    it("registra el pago solo si está cobrado", () => {
        const opts = { unitPrices: { s1: 5000 }, paymentMethod: "mercadopago" as const };
        expect(buildOrderFromPendingSales([sale()], { ...opts, paid: true }).payments).toEqual([
            { method: "mercadopago", amount: 10000, status: "paid" },
        ]);
        expect(buildOrderFromPendingSales([sale()], { ...opts, paid: false }).payments).toEqual([]);
    });

    it("toma la fecha del primer escaneo en hora de Argentina", () => {
        const order = buildOrderFromPendingSales(
            [
                sale({ id: "s1", createdAt: new Date("2026-11-21T10:00:00-03:00") }),
                // 23:30 del 19 en Argentina = 02:30 UTC del 20
                sale({ id: "s2", createdAt: new Date("2026-11-19T23:30:00-03:00") }),
            ],
            { unitPrices: { s1: 1, s2: 1 }, paymentMethod: "cash", paid: true },
        );
        expect(order.orderDate).toBe("2026-11-19");
    });

    it("respeta el IVA del producto y junta las notas", () => {
        const order = buildOrderFromPendingSales([sale({ taxRate: 21, notes: "Juan, retira el lunes" })], {
            unitPrices: { s1: 100 },
            paymentMethod: "cash",
            paid: true,
            notes: "Venta por WhatsApp",
        });
        expect(order.items[0].taxRate).toBe(21);
        expect(order.notes).toBe("Venta por WhatsApp\nPasta térmica MX-4: Juan, retira el lunes");
    });

    it("falla si falta el precio de alguna venta", () => {
        expect(() =>
            buildOrderFromPendingSales([sale()], { unitPrices: {}, paymentMethod: "cash", paid: true }),
        ).toThrow(/precio/);
    });
});
