import { describe, expect, it } from "vitest";
import {
    availableLots,
    DEFAULT_ROTATION_SETTINGS,
    evaluateRotation,
    type RotationInput,
} from "@/lib/inventory/rotation";
import { rotationSettingsSchema } from "@/lib/validators/storeSettingsSchema";
import { buildRotationDigest } from "@/lib/inventory/rotationDigest";
import type { RotationReport, RotationRow } from "@/types/shared/stockRotation";

const NOW = new Date("2026-11-25T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
const settings = DEFAULT_ROTATION_SETTINGS;

const input = (patch: Partial<RotationInput>): RotationInput => ({
    availableStock: 0,
    reservedStock: 0,
    productCreatedAt: daysAgo(365),
    unitsSold: 0,
    lastSaleAt: null,
    lots: [],
    replacementCost: null,
    hasDistributorLinks: false,
    referenceDiff: null,
    now: NOW,
    ...patch,
});

describe("availableLots", () => {
    it("descuenta las reservas de los lotes más viejos", () => {
        const lots = availableLots(
            [
                { receivedAt: daysAgo(10), remainingQuantity: 2, unitCost: 100 },
                { receivedAt: daysAgo(200), remainingQuantity: 3, unitCost: 80 },
            ],
            4,
            1,
        );
        expect(lots).toEqual([{ receivedAt: daysAgo(10), remainingQuantity: 1, unitCost: 100 }]);
    });

    it("si hay más unidades en lotes que stock, se quedan los más nuevos", () => {
        const lots = availableLots(
            [
                { receivedAt: daysAgo(300), remainingQuantity: 2, unitCost: 50 },
                { receivedAt: daysAgo(5), remainingQuantity: 2, unitCost: 70 },
            ],
            0,
            3,
        );
        expect(lots.map((l) => l.remainingQuantity)).toEqual([1, 2]);
        expect(lots[0].unitCost).toBe(50);
    });
});

describe("evaluateRotation", () => {
    it("marca como lento lo que dura más que el umbral al ritmo actual", () => {
        // 3 vendidas en 90 días → 1 cada 30 días; 5 en stock → 150 días
        const m = evaluateRotation(input({ availableStock: 5, unitsSold: 3 }), settings);
        expect(m.coverageDays).toBe(150);
        expect(m.reasons).toContain("slow");
    });

    it("no marca lento lo que rota", () => {
        const m = evaluateRotation(input({ availableStock: 5, unitsSold: 30 }), settings);
        expect(m.coverageDays).toBe(15);
        expect(m.reasons).not.toContain("slow");
    });

    it("sin ventas es lento, salvo que el producto sea nuevo", () => {
        expect(evaluateRotation(input({ availableStock: 1 }), settings).reasons).toContain("slow");
        const fresh = evaluateRotation(input({ availableStock: 1, productCreatedAt: daysAgo(20) }), settings);
        expect(fresh.reasons).not.toContain("slow");
    });

    it("el ritmo de un producto nuevo se calcula sobre los días que lleva", () => {
        // 30 días cargado, 3 vendidas → 0,1 por día; 10 en stock → 100 días
        const m = evaluateRotation(
            input({ availableStock: 10, unitsSold: 3, productCreatedAt: daysAgo(30) }),
            settings,
        );
        expect(m.coverageDays).toBe(100);
    });

    it("cuenta las unidades viejas y el costo parado", () => {
        const m = evaluateRotation(
            input({
                availableStock: 3,
                unitsSold: 30,
                lots: [
                    { receivedAt: daysAgo(150), remainingQuantity: 1, unitCost: 1000 },
                    { receivedAt: daysAgo(10), remainingQuantity: 2, unitCost: 1300 },
                ],
            }),
            settings,
        );
        expect(m.oldUnits).toBe(1);
        expect(m.oldestAgeDays).toBe(150);
        expect(m.stockCost).toBe(3600);
        expect(m.averageUnitCost).toBe(1200);
        expect(m.reasons).toEqual(["old"]);
    });

    it("marca reposición más barata según el % configurado", () => {
        const lots = [{ receivedAt: daysAgo(10), remainingQuantity: 1, unitCost: 1000 }];
        const cheaper = evaluateRotation(
            input({ availableStock: 1, unitsSold: 30, lots, replacementCost: 960 }),
            settings,
        );
        expect(cheaper.reasons).toEqual(["cheaper_replacement"]);
        expect(cheaper.replacementDiff).toBeCloseTo(-0.04);

        const noise = evaluateRotation(
            input({ availableStock: 1, unitsSold: 30, lots, replacementCost: 990 }),
            settings,
        );
        expect(noise.reasons).toEqual([]);
    });

    it("reponer sólo si está habilitado, se vende y el distribuidor tiene stock", () => {
        const base = input({ availableStock: 1, unitsSold: 30, replacementCost: 500 });
        expect(evaluateRotation(base, settings).reasons).not.toContain("restock");

        const enabled = { ...settings, rotationRestockEnabled: true };
        expect(evaluateRotation(base, enabled).reasons).toContain("restock");
        expect(evaluateRotation({ ...base, availableStock: 0 }, enabled).reasons).toEqual(["restock"]);
        expect(evaluateRotation({ ...base, replacementCost: null }, enabled).reasons).not.toContain("restock");
        expect(evaluateRotation({ ...base, availableStock: 20 }, enabled).reasons).not.toContain("restock");
    });

    it("unidades sin lote quedan sin costo ni antigüedad", () => {
        const m = evaluateRotation(input({ availableStock: 2 }), settings);
        expect(m.unitsWithoutLots).toBe(2);
        expect(m.oldestAgeDays).toBeNull();
        expect(m.stockCost).toBe(0);
    });
});

describe("evaluateRotation: casos borde", () => {
    it("con una ventana corta, el ritmo no se diluye en el mínimo de 14 días", () => {
        // 7 vendidas en 7 días → 1 por día; 30 en stock → 30 días
        const m = evaluateRotation(
            input({ availableStock: 30, unitsSold: 7 }),
            { ...settings, rotationSalesWindowDays: 7 },
        );
        expect(m.coverageDays).toBe(30);
    });

    it("un producto viejo que recién recibe stock no es lento", () => {
        const m = evaluateRotation(
            input({
                availableStock: 5,
                productCreatedAt: daysAgo(365),
                lots: [{ receivedAt: daysAgo(2), remainingQuantity: 5, unitCost: 100 }],
            }),
            settings,
        );
        expect(m.reasons).not.toContain("slow");
    });

    it("el ritmo de un stock recién llegado se calcula sobre los días que lleva", () => {
        // Stock de hace 30 días, 3 vendidas → 0,1 por día; 10 en stock → 100 días
        const m = evaluateRotation(
            input({
                availableStock: 10,
                unitsSold: 3,
                lots: [{ receivedAt: daysAgo(30), remainingQuantity: 10, unitCost: 100 }],
            }),
            settings,
        );
        expect(m.coverageDays).toBe(100);
    });

    it("sin ventas en la ventana, mira la última venta contra el umbral de lento", () => {
        const wide = { ...settings, rotationSlowCoverageDays: 180 };
        const lots = [{ receivedAt: daysAgo(300), remainingQuantity: 1, unitCost: 100 }];
        const recent = evaluateRotation(input({ availableStock: 1, lots, lastSaleAt: daysAgo(100) }), wide);
        expect(recent.reasons).not.toContain("slow");
        const stale = evaluateRotation(input({ availableStock: 1, lots, lastSaleAt: daysAgo(200) }), wide);
        expect(stale.reasons).toContain("slow");
        // Sin fecha de alta ni lotes ni ventas: se marca
        expect(
            evaluateRotation(input({ availableStock: 1, productCreatedAt: null }), wide).reasons,
        ).toContain("slow");
    });

    it("los lotes sin costo no bajan el promedio", () => {
        const m = evaluateRotation(
            input({
                availableStock: 2,
                unitsSold: 30,
                replacementCost: 960,
                lots: [
                    { receivedAt: daysAgo(10), remainingQuantity: 1, unitCost: 1000 },
                    { receivedAt: daysAgo(5), remainingQuantity: 1, unitCost: null },
                ],
            }),
            settings,
        );
        expect(m.averageUnitCost).toBe(1000);
        expect(m.stockCost).toBe(1000);
        expect(m.unitsWithoutCost).toBe(1);
        expect(m.unitsWithoutLots).toBe(0);
        expect(m.reasons).toContain("cheaper_replacement");
    });

    it("con 0% no marca reposición al mismo costo", () => {
        const m = evaluateRotation(
            input({
                availableStock: 1,
                unitsSold: 30,
                replacementCost: 1000,
                lots: [{ receivedAt: daysAgo(10), remainingQuantity: 1, unitCost: 1000 }],
            }),
            { ...settings, rotationCheaperReplacementPercent: 0 },
        );
        expect(m.reasons).not.toContain("cheaper_replacement");
    });
});

describe("evaluateRotation: competencia y reposición", () => {
    // Producto que rota bien, para que sólo aparezca el motivo que se prueba
    const rotating = { availableStock: 2, unitsSold: 30 };

    it("marca competencia más barata desde el % configurado", () => {
        expect(evaluateRotation(input({ ...rotating, referenceDiff: 0.06 }), settings).reasons).toEqual([
            "competitor_cheaper",
        ]);
        expect(evaluateRotation(input({ ...rotating, referenceDiff: 0.03 }), settings).reasons).toEqual([]);
        expect(evaluateRotation(input({ ...rotating, referenceDiff: -0.1 }), settings).reasons).toEqual([]);
    });

    it("con 0% no marca al mismo precio que la competencia", () => {
        const zero = { ...settings, rotationCompetitorPercent: 0 };
        expect(evaluateRotation(input({ ...rotating, referenceDiff: 0 }), zero).reasons).toEqual([]);
        expect(evaluateRotation(input({ ...rotating, referenceDiff: 0.001 }), zero).reasons).toEqual([
            "competitor_cheaper",
        ]);
    });

    it("sin reposición: vinculado y ningún distribuidor con stock", () => {
        expect(
            evaluateRotation(input({ ...rotating, hasDistributorLinks: true, replacementCost: null }), settings)
                .reasons,
        ).toEqual(["no_supplier"]);
        expect(
            evaluateRotation(input({ ...rotating, hasDistributorLinks: true, replacementCost: 500 }), settings)
                .reasons,
        ).toEqual([]);
        // Sin vínculos no se sabe: no se marca
        expect(evaluateRotation(input(rotating), settings).reasons).toEqual([]);
    });

    it("sin stock no marca motivos para sacar", () => {
        const m = evaluateRotation(
            input({ availableStock: 0, unitsSold: 30, hasDistributorLinks: true, referenceDiff: 0.2 }),
            settings,
        );
        expect(m.reasons).toEqual([]);
    });
});

describe("buildRotationDigest", () => {
    const row = (patch: Partial<RotationRow>): RotationRow => ({
        productId: "p",
        name: "Producto",
        sku: "",
        image: null,
        effectivePrice: 1000,
        availableStock: 1,
        unitsSold: 0,
        dailySales: 0,
        lastSaleAt: null,
        coverageDays: null,
        oldestAgeDays: null,
        oldUnits: 0,
        stockCost: 0,
        averageUnitCost: null,
        unitsWithoutLots: 0,
        unitsWithoutCost: 0,
        replacementCost: null,
        replacementDistributor: null,
        replacementDiff: null,
        linkedDistributors: 0,
        referencePrice: null,
        referenceSource: null,
        referenceDiff: null,
        reasons: [],
        ...patch,
    });
    const report = (rows: RotationRow[]): RotationReport => {
        const byReason = { slow: 0, old: 0, cheaper_replacement: 0, competitor_cheaper: 0, no_supplier: 0, restock: 0 };
        for (const r of rows) for (const reason of r.reasons) byReason[reason]++;
        const toRotate = rows.filter((r) => r.reasons.some((x) => x !== "restock"));
        return {
            settings,
            rows,
            summary: {
                toRotate: toRotate.length,
                stockCost: toRotate.reduce((s, r) => s + r.stockCost, 0),
                byReason,
            },
        };
    };

    it("sin productos no avisa", () => {
        expect(buildRotationDigest(report([]))).toBeNull();
    });

    it("resume motivos, costo parado y los productos con más plata parada", () => {
        const digest = buildRotationDigest(
            report([
                row({ productId: "a", name: "Placa A", stockCost: 50000, oldestAgeDays: 200, availableStock: 2, reasons: ["slow", "old"] }),
                row({ productId: "b", name: "Mouse B", stockCost: 10000, reasons: ["competitor_cheaper"] }),
                row({ productId: "c", name: "SSD C", reasons: ["restock"], availableStock: 0 }),
            ]),
        )!;
        expect(digest.title).toBe("🐢 2 productos para rotar");
        expect(digest.description).toContain("Costo parado: **$60.000**");
        expect(digest.description).toContain("• Stock lento: 1");
        expect(digest.description).toContain("• Competencia más barata: 1");
        expect(digest.description).not.toContain("Reposición más barata");
        expect(digest.description).toContain("• Placa A — 2 u., $50.000, 200 días");
        expect(digest.description).not.toContain("SSD C");
        expect(digest.description).toContain("🔁 Para reponer: 1");
    });

    it("sólo con productos para reponer", () => {
        const digest = buildRotationDigest(report([row({ reasons: ["restock"], availableStock: 0 })]))!;
        expect(digest.title).toBe("🔁 1 producto para reponer");
        expect(digest.description).not.toContain("Costo parado");
    });
});

describe("rotationSettingsSchema", () => {
    it("un campo vacío da un error en castellano", () => {
        const r = rotationSettingsSchema.safeParse({ ...DEFAULT_ROTATION_SETTINGS, rotationOldStockDays: Number.NaN });
        expect(r.success).toBe(false);
        expect(r.error?.issues[0]?.message).toBe("Stock viejo: completá un número");
    });

    it("acepta los valores por defecto y rechaza decimales en días", () => {
        expect(rotationSettingsSchema.safeParse(DEFAULT_ROTATION_SETTINGS).success).toBe(true);
        expect(
            rotationSettingsSchema.safeParse({ ...DEFAULT_ROTATION_SETTINGS, rotationOldStockDays: 10.5 }).success,
        ).toBe(false);
    });
});
