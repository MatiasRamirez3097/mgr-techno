import { describe, expect, it } from "vitest";
import { calculateQuoteTotals } from "@/services/quotes/calculateQuoteTotals";

describe("calculateQuoteTotals", () => {
    it("discrimina neto e IVA de precios con IVA incluido", () => {
        const result = calculateQuoteTotals([
            {
                origin: "manual",
                name: "Item 21%",
                quantity: 1,
                unitPrice: 1210,
                taxRate: 21,
                discount: 0,
            },
            {
                origin: "manual",
                name: "Item 10,5%",
                quantity: 2,
                unitPrice: 1105,
                taxRate: 10.5,
                discount: 0,
            },
        ] as Parameters<typeof calculateQuoteTotals>[0]);

        expect(result.total).toBe(3420);
        expect(result.subtotal).toBe(3000);
        expect(result.ivaTotal).toBe(420);
    });

    it("resta el descuento de la línea", () => {
        const result = calculateQuoteTotals([
            {
                origin: "manual",
                name: "Con descuento",
                quantity: 2,
                unitPrice: 1000,
                taxRate: 21,
                discount: 200,
            },
        ] as Parameters<typeof calculateQuoteTotals>[0]);

        expect(result.total).toBe(1800);
        expect(result.discountTotal).toBe(200);
        expect(result.itemsWithSubtotals[0].subtotal).toBe(1800);
    });
});
