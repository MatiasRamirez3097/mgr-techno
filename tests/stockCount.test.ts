import { describe, expect, it } from "vitest";
import {
    computeExpectedStock,
    countPriority,
    describeCountReasons,
    pickCountQueue,
    takeFromLots,
} from "@/lib/inventory/stockCount";
import {
    recordStockCountSchema,
    resolveStockCountSchema,
    stockCountSettingsSchema,
} from "@/lib/validators/stockCountSchema";

const NOW = new Date("2026-11-26T15:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("computeExpectedStock", () => {
    it("descuenta lo que ya se fue y suma lo asignado que no salió", () => {
        expect(
            computeExpectedStock({
                totalStock: 10,
                pendingSalesUnits: 2,
                deliveredUnallocatedUnits: 1,
                allocatedUndeliveredUnits: 3,
            }).expected,
        ).toBe(10);
        expect(
            computeExpectedStock({ totalStock: 5, pendingSalesUnits: 2, deliveredUnallocatedUnits: 0, allocatedUndeliveredUnits: 0 })
                .expected,
        ).toBe(3);
    });

    it("nunca da negativo", () => {
        expect(
            computeExpectedStock({ totalStock: 1, pendingSalesUnits: 3, deliveredUnallocatedUnits: 0, allocatedUndeliveredUnits: 0 })
                .expected,
        ).toBe(0);
    });
});

describe("lista para contar", () => {
    const c = (productId: string, lastCountedAt: Date | null, unitsSold = 0) => ({ productId, lastCountedAt, unitsSold });

    it("prioriza lo que nunca se contó y lo que más se vende", () => {
        expect(countPriority(c("a", null), NOW)).toBeGreaterThan(countPriority(c("b", daysAgo(100)), NOW));
        expect(countPriority(c("a", daysAgo(60), 20), NOW)).toBeGreaterThan(countPriority(c("b", daysAgo(60), 0), NOW));
        // Muy vendido y contado hace 60 días le gana a uno quieto contado hace 100
        expect(countPriority(c("a", daysAgo(60), 20), NOW)).toBeGreaterThan(countPriority(c("b", daysAgo(100)), NOW));
    });

    it("saca lo contado hace poco, respeta el límite y el orden es estable", () => {
        const list = [c("z", null), c("y", daysAgo(10), 50), c("x", daysAgo(40)), c("w", null)];
        const picked = pickCountQueue(list, { limit: 2, repeatDays: 30, now: NOW });
        expect(picked.map((p) => p.productId)).toEqual(["w", "z"]);
        expect(pickCountQueue(list, { limit: 10, repeatDays: 30, now: NOW }).map((p) => p.productId)).toEqual([
            "w",
            "z",
            "x",
        ]);
        expect(pickCountQueue(list, { limit: 0, repeatDays: 30, now: NOW })).toEqual([]);
    });

    it("explica por qué se eligió", () => {
        expect(describeCountReasons(c("a", null, 3), NOW)).toEqual(["Nunca contado", "3 vendidas en 90 días"]);
        expect(describeCountReasons(c("a", daysAgo(45), 1), NOW)).toEqual(["Contado hace 45 días", "1 vendida en 90 días"]);
        expect(describeCountReasons(c("a", daysAgo(45)), NOW)).toEqual(["Contado hace 45 días"]);
    });
});

describe("takeFromLots", () => {
    const lots = [
        { id: "viejo", remainingQuantity: 2, unitCost: 100 },
        { id: "vacio", remainingQuantity: 0, unitCost: 500 },
        { id: "nuevo", remainingQuantity: 5, unitCost: 120 },
    ];

    it("descuenta de los lotes más viejos y calcula el costo", () => {
        expect(takeFromLots(lots, 3)).toEqual({
            takes: [
                { id: "viejo", quantity: 2 },
                { id: "nuevo", quantity: 1 },
            ],
            cost: 320,
            uncovered: 0,
        });
    });

    it("informa lo que no alcanzó a salir de un lote y el costo desconocido", () => {
        expect(takeFromLots(lots, 10)).toMatchObject({ uncovered: 3, cost: 2 * 100 + 5 * 120 });
        expect(takeFromLots([{ id: "a", remainingQuantity: 3, unitCost: null }], 2)).toMatchObject({ cost: null });
        expect(takeFromLots([], 2)).toEqual({ takes: [], cost: null, uncovered: 2 });
    });
});

describe("validaciones del conteo", () => {
    it("configuración con límites y mensajes en castellano", () => {
        expect(stockCountSettingsSchema.safeParse({ stockCountDailyProducts: 5, stockCountRepeatDays: 30 }).success).toBe(true);
        const r = stockCountSettingsSchema.safeParse({ stockCountDailyProducts: 0, stockCountRepeatDays: 30 });
        expect(r.success).toBe(false);
        expect(r.error?.issues[0].message).toBe("Productos por día: mínimo 1");
        expect(stockCountSettingsSchema.safeParse({ stockCountDailyProducts: 5, stockCountRepeatDays: 1.5 }).success).toBe(false);
    });

    it("el conteo es un entero no negativo", () => {
        const id = "a".repeat(24);
        expect(recordStockCountSchema.safeParse({ productId: id, counted: 0 }).success).toBe(true);
        expect(recordStockCountSchema.safeParse({ productId: id, counted: -1 }).success).toBe(false);
        expect(recordStockCountSchema.safeParse({ productId: id, counted: 1.5 }).success).toBe(false);
        expect(recordStockCountSchema.safeParse({ productId: "x", counted: 1 }).success).toBe(false);
    });

    it("un ajuste necesita motivo", () => {
        expect(resolveStockCountSchema.safeParse({ action: "adjust" }).success).toBe(false);
        expect(resolveStockCountSchema.safeParse({ action: "adjust", reason: "lost" }).success).toBe(true);
        expect(resolveStockCountSchema.safeParse({ action: "dismiss" }).success).toBe(true);
        expect(resolveStockCountSchema.safeParse({ action: "pending_sale" }).success).toBe(true);
    });
});
