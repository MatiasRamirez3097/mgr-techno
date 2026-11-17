import { describe, expect, it } from "vitest";
import {
    buildPriceUpdate,
    comparePriceWithCosts,
    compareWithReferences,
    getMarginStatus,
    resolveMargins,
    suggestPrice,
    type CategoryMarginNode,
} from "@/lib/priceReview";
import { categoryMarginsSchema, applyPricesSchema } from "@/lib/validators/pricingSchema";
import { pricingSettingsSchema } from "@/lib/validators/storeSettingsSchema";

const defaults = { targetMarginPercent: 20, minMarginPercent: 10 };

const tree = new Map<string, CategoryMarginNode>(
    [
        { id: "hw", name: "Hardware", parentId: null, targetMarginPercent: 15, minMarginPercent: null },
        { id: "gpu", name: "Placas de video", parentId: "hw", targetMarginPercent: null, minMarginPercent: 5 },
        { id: "gpu-nv", name: "NVIDIA", parentId: "gpu", targetMarginPercent: null, minMarginPercent: null },
        { id: "perif", name: "Periféricos", parentId: null, targetMarginPercent: 35, minMarginPercent: 25 },
        { id: "low", name: "Cables", parentId: null, targetMarginPercent: 5, minMarginPercent: null },
    ].map((c) => [c.id, c]),
);

describe("resolveMargins", () => {
    it("sin categorías usa el general", () => {
        expect(resolveMargins([], tree, defaults)).toMatchObject({
            targetMarginPercent: 20,
            minMarginPercent: 10,
            targetSource: null,
        });
    });

    it("hereda de las categorías superiores, objetivo y mínimo por separado", () => {
        expect(resolveMargins(["gpu-nv"], tree, defaults)).toEqual({
            targetMarginPercent: 15,
            minMarginPercent: 5,
            targetSource: "Hardware",
            minSource: "Placas de video",
        });
    });

    it("con varias categorías usa la primera que defina el margen", () => {
        expect(resolveMargins(["perif", "gpu"], tree, defaults).targetMarginPercent).toBe(35);
        expect(resolveMargins(["missing", "gpu"], tree, defaults).targetMarginPercent).toBe(15);
    });

    it("el mínimo nunca supera al objetivo", () => {
        expect(resolveMargins(["low"], tree, defaults)).toMatchObject({ targetMarginPercent: 5, minMarginPercent: 5 });
    });

    it("no se cuelga con jerarquías circulares", () => {
        const loop = new Map<string, CategoryMarginNode>([
            ["a", { id: "a", name: "A", parentId: "b" }],
            ["b", { id: "b", name: "B", parentId: "a" }],
        ]);
        expect(resolveMargins(["a"], loop, defaults).targetMarginPercent).toBe(20);
    });
});

describe("suggestPrice y getMarginStatus", () => {
    it("redondea hacia arriba al múltiplo", () => {
        expect(suggestPrice(100000, 20, 100)).toBe(120000);
        expect(suggestPrice(123456, 20, 100)).toBe(148200);
        expect(suggestPrice(123456, 20, 1000)).toBe(149000);
        expect(suggestPrice(1000, 10, 100)).toBe(1100);
    });

    it("clasifica el margen", () => {
        expect(getMarginStatus(null, 10, 20)).toBe("no_cost");
        expect(getMarginStatus(0.05, 10, 20)).toBe("below_min");
        expect(getMarginStatus(0.15, 10, 20)).toBe("below_target");
        expect(getMarginStatus(0.2, 10, 20)).toBe("ok");
        // 19,96% por redondeo del precio sugerido cuenta como objetivo cumplido
        expect(getMarginStatus(0.19996, 10, 20)).toBe("ok");
    });
});

describe("comparePriceWithCosts", () => {
    const base = { targetMarginPercent: 20, minMarginPercent: 10, roundingStep: 100 };

    it("usa el costo más bajo con stock y disponible", () => {
        const result = comparePriceWithCosts({
            ...base,
            effectivePrice: 105000,
            costs: [
                { distributor: "elit", price: 90000, inStock: false, available: true },
                { distributor: "invid", price: 95000, inStock: true, available: false },
                { distributor: "air", price: 100000, inStock: true, available: true },
                { distributor: "newbytes", price: 105000, inStock: true, available: true },
            ],
        });
        expect(result).toMatchObject({
            bestCost: 100000,
            bestDistributor: "air",
            marginStatus: "below_min",
            suggestedPrice: 120000,
        });
        expect(result.margin).toBeCloseTo(0.05);
    });

    it("un margen exactamente igual al mínimo no está bajo el mínimo", () => {
        const result = comparePriceWithCosts({
            ...base,
            effectivePrice: 110000,
            costs: [{ distributor: "air", price: 100000, inStock: true, available: true }],
        });
        expect(result.marginStatus).toBe("below_target");
    });

    it("sin costos con stock no sugiere nada", () => {
        expect(
            comparePriceWithCosts({
                ...base,
                effectivePrice: 100,
                costs: [{ distributor: "elit", price: 80, inStock: false, available: true }],
            }),
        ).toEqual({ bestCost: null, bestDistributor: null, margin: null, marginStatus: "no_cost", suggestedPrice: null });
    });
});

describe("buildPriceUpdate", () => {
    it("sin oferta cambia el regular", () => {
        expect(buildPriceUpdate({ regularPrice: 1000, salePrice: null }, 1200)).toEqual({
            regularPrice: 1200,
            salePrice: null,
        });
    });

    it("con oferta vigente cambia la oferta si sigue por debajo del regular", () => {
        expect(buildPriceUpdate({ regularPrice: 1000, salePrice: 900 }, 950)).toEqual({
            regularPrice: 1000,
            salePrice: 950,
        });
    });

    it("si el precio nuevo supera al regular, quita la oferta", () => {
        expect(buildPriceUpdate({ regularPrice: 1000, salePrice: 900 }, 1100)).toEqual({
            regularPrice: 1100,
            salePrice: null,
        });
    });
});

describe("validadores", () => {
    it("márgenes generales: el mínimo no supera al objetivo", () => {
        expect(pricingSettingsSchema.safeParse({ targetMarginPercent: 20, minMarginPercent: 10, priceRoundingStep: 100 }).success).toBe(true);
        expect(pricingSettingsSchema.safeParse({ targetMarginPercent: 10, minMarginPercent: 20, priceRoundingStep: 100 }).success).toBe(false);
        expect(pricingSettingsSchema.safeParse({ targetMarginPercent: 20, minMarginPercent: 10, priceRoundingStep: 0 }).success).toBe(false);
    });

    it("márgenes por categoría admiten null", () => {
        expect(
            categoryMarginsSchema.safeParse({
                categories: [{ id: "a", targetMarginPercent: null, minMarginPercent: 5 }],
            }).success,
        ).toBe(true);
        expect(
            categoryMarginsSchema.safeParse({
                categories: [{ id: "a", targetMarginPercent: 5, minMarginPercent: 10 }],
            }).success,
        ).toBe(false);
    });

    it("precios a aplicar", () => {
        expect(applyPricesSchema.safeParse({ updates: [] }).success).toBe(false);
        expect(applyPricesSchema.safeParse({ updates: [{ productId: "x", price: 0 }] }).success).toBe(false);
        expect(applyPricesSchema.safeParse({ updates: [{ productId: "x", price: 10 }] }).success).toBe(true);
    });
});

describe("compareWithReferences", () => {
    const ref = (price: number | null, inStock = true, available = true) => ({ price, inStock, available });

    it("compara contra la referencia más barata con stock", () => {
        const result = compareWithReferences(110, [ref(120), ref(100), ref(90, false)]);
        expect(result.bestReferencePrice).toBe(100);
        expect(result.referenceDiff).toBeCloseTo(0.1);
    });

    it("sin stock en ninguna, usa la más barata publicada", () => {
        expect(compareWithReferences(100, [ref(120, false), ref(110, false)]).bestReferencePrice).toBe(110);
    });

    it("ignora las que ya no están en la tienda o no tienen precio", () => {
        const result = compareWithReferences(100, [ref(50, true, false), ref(null)]);
        expect(result).toEqual({ bestReferencePrice: null, referenceDiff: null });
    });
});
