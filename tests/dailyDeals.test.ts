import { describe, expect, it } from "vitest";
import {
    computeDealPrice,
    evaluateDealProduct,
    expandCategoryIds,
    isRecentlyFeatured,
    marginAfterDiscount,
    pickDealCost,
    selectDailyDeals,
    type DealCandidate,
    type ResolvedDealGroup,
} from "@/lib/dailyDeals/selection";
import { dailyDealSettingsSchema } from "@/lib/validators/dailyDealsSchema";

// Random determinístico para los sorteos
function seeded(seed = 1) {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

const group = (patch: Partial<ResolvedDealGroup>): ResolvedDealGroup => ({
    id: patch.id ?? "g",
    name: patch.name ?? "Grupo",
    distributors: [],
    categoryIds: [],
    brandIds: [],
    maxProducts: null,
    ...patch,
});

describe("utilidad y precio de oferta", () => {
    it("30% de utilidad con 10% de descuento deja 17%", () => {
        expect(marginAfterDiscount(30, 10)).toBeCloseTo(17, 5);
        expect(marginAfterDiscount(10, 20)).toBeLessThan(0);
    });

    it("redondea hacia abajo con el paso de redondeo", () => {
        expect(computeDealPrice(130_000, 10, 100)).toBe(117_000);
        expect(computeDealPrice(129_990, 10, 100)).toBe(116_900);
        expect(computeDealPrice(50, 10, 100)).toBeNull();
    });
});

describe("pickDealCost", () => {
    const costs = [
        { distributor: "elit" as const, price: 90, inStock: false, available: true },
        { distributor: "invid" as const, price: 100, inStock: true, available: true },
        { distributor: "air" as const, price: 80, inStock: true, available: false },
    ];

    it("exigiendo stock, el menor costo entre los que tienen stock", () => {
        expect(pickDealCost(costs, true)).toMatchObject({ cost: 100, distributor: "invid", inStock: true });
    });

    it("con algún distribuidor con stock, no se usa el costo de uno sin stock", () => {
        expect(pickDealCost(costs, false)).toMatchObject({ cost: 100, distributor: "invid", distributors: ["invid"] });
    });

    it("sin exigir stock y sin ninguno con stock, el último precio conocido", () => {
        const noStock = [costs[0], { ...costs[1], inStock: false }];
        expect(pickDealCost(noStock, true)).toBeNull();
        expect(pickDealCost(noStock, false)).toMatchObject({ cost: 90, distributor: "elit", inStock: false });
    });
});

describe("evaluateDealProduct", () => {
    const settings = { minMarginPercent: 30, discountPercent: 10, requireDistributorStock: true };
    const withCost = (price: number, inStock = true) => [
        { distributor: "pcmodd" as const, price, inStock, available: true },
    ];

    it("calcula la utilidad antes y después del descuento", () => {
        const result = evaluateDealProduct({ regularPrice: 130_000, costs: withCost(100_000) }, settings, 100);
        expect(result).toMatchObject({ eligible: true, dealPrice: 117_000 });
        if (result.eligible) {
            expect(result.marginPercent).toBeCloseTo(30, 5);
            expect(result.dealMarginPercent).toBeCloseTo(17, 5);
        }
    });

    it("dice por qué un producto no participa", () => {
        const reason = (p: Parameters<typeof evaluateDealProduct>[0]) => {
            const r = evaluateDealProduct(p, settings, 100);
            return r.eligible ? null : r.reason;
        };
        expect(reason({ regularPrice: 130_000, salePrice: 120_000, costs: withCost(100_000) })).toBe("on_sale");
        expect(reason({ regularPrice: 130_000, costs: [] })).toBe("no_cost");
        expect(reason({ regularPrice: 130_000, costs: withCost(100_000, false) })).toBe("no_stock");
        expect(reason({ regularPrice: 120_000, costs: withCost(100_000) })).toBe("low_margin");
    });
});

describe("no repetir", () => {
    it("cuenta los últimos N días sin contar hoy", () => {
        expect(isRecentlyFeatured("2026-11-17", "2026-11-18", 7)).toBe(true);
        expect(isRecentlyFeatured("2026-11-11", "2026-11-18", 7)).toBe(true);
        expect(isRecentlyFeatured("2026-11-10", "2026-11-18", 7)).toBe(false);
        expect(isRecentlyFeatured("2026-11-17", "2026-11-18", 0)).toBe(false);
        expect(isRecentlyFeatured(null, "2026-11-18", 7)).toBe(false);
    });
});

describe("expandCategoryIds", () => {
    it("suma las subcategorías de todos los niveles", () => {
        const tree = [
            { id: "hw", parentId: null },
            { id: "psu", parentId: "hw" },
            { id: "psu-modular", parentId: "psu" },
            { id: "perif", parentId: null },
        ];
        expect(expandCategoryIds(["hw"], tree).sort()).toEqual(["hw", "psu", "psu-modular"]);
    });
});

describe("selectDailyDeals", () => {
    const today = "2026-11-18";
    const candidate = (id: string, patch: Partial<DealCandidate> = {}): DealCandidate => ({
        productId: id,
        categoryIds: [],
        brandId: null,
        distributors: ["elit"],
        lastFeaturedOn: null,
        ...patch,
    });
    // Fuentes de PCMODD (p1, p2), fuentes de Elit (e1, e2), otros de PCMODD (m1, m2)
    const candidates = [
        candidate("p1", { categoryIds: ["psu"], distributors: ["pcmodd"] }),
        candidate("p2", { categoryIds: ["psu"], distributors: ["pcmodd"] }),
        candidate("e1", { categoryIds: ["psu"] }),
        candidate("e2", { categoryIds: ["psu"] }),
        candidate("m1", { categoryIds: ["cooler"], distributors: ["pcmodd"] }),
        candidate("m2", { categoryIds: ["cooler"], distributors: ["pcmodd"] }),
    ];
    const run = (groups: ResolvedDealGroup[], count = 10, list = candidates) =>
        selectDailyDeals({ candidates: list, groups, count, noRepeatDays: 7, today, random: seeded() });
    const ids = (r: ReturnType<typeof run>) => r.picks.map((p) => p.productId).sort();

    it("filtros en el mismo grupo se cruzan: sólo fuentes de PCMODD", () => {
        expect(ids(run([group({ distributors: ["pcmodd"], categoryIds: ["psu"] })]))).toEqual(["p1", "p2"]);
    });

    it("grupos separados se suman: fuentes en general y productos de PCMODD", () => {
        const result = run([group({ id: "psu", categoryIds: ["psu"] }), group({ id: "pcmodd", distributors: ["pcmodd"] })]);
        expect(ids(result)).toEqual(["e1", "e2", "m1", "m2", "p1", "p2"]);
        // Las fuentes de PCMODD las toma el primer grupo
        expect(result.groups.map((g) => g.picked)).toEqual([4, 2]);
    });

    it("respeta el cupo y el orden de los grupos", () => {
        const result = run([group({ id: "psu", categoryIds: ["psu"], maxProducts: 1 }), group({ id: "all" })], 3);
        expect(result.picks).toHaveLength(3);
        expect(result.picks[0].groupId).toBe("psu");
        expect(result.picks.filter((p) => p.groupId === "psu")).toHaveLength(1);
    });

    it("si a un grupo le faltan productos, los lugares pasan al siguiente", () => {
        const result = run([group({ id: "psu-pcmodd", distributors: ["pcmodd"], categoryIds: ["psu"] }), group({ id: "all" })], 4);
        expect(result.picks.map((p) => p.groupId)).toEqual(["psu-pcmodd", "psu-pcmodd", "all", "all"]);
    });

    it("sin grupos participa todo, sin pasarse de la cantidad", () => {
        expect(run([], 4).picks).toHaveLength(4);
    });

    it("no repite los que salieron hace poco, salvo que no alcancen (primero los más viejos)", () => {
        const list = [
            candidate("a"),
            candidate("b", { lastFeaturedOn: "2026-11-17" }),
            candidate("c", { lastFeaturedOn: "2026-11-12" }),
        ];
        const two = run([], 2, list);
        expect(two.picks).toEqual([
            { productId: "a", groupId: "all", repeated: false },
            { productId: "c", groupId: "all", repeated: true },
        ]);
        expect(run([], 1, list).picks).toEqual([{ productId: "a", groupId: "all", repeated: false }]);
    });

    it("el sorteo cambia con el azar", () => {
        const list = Array.from({ length: 30 }, (_, i) => candidate(`x${i}`));
        const a = selectDailyDeals({ candidates: list, groups: [], count: 5, noRepeatDays: 7, today, random: seeded(1) });
        const b = selectDailyDeals({ candidates: list, groups: [], count: 5, noRepeatDays: 7, today, random: seeded(99) });
        expect(a.picks.map((p) => p.productId)).not.toEqual(b.picks.map((p) => p.productId));
    });
});

describe("dailyDealSettingsSchema", () => {
    const base = {
        enabled: true,
        productCount: 6,
        noRepeatDays: 7,
        minMarginPercent: 30,
        discountPercent: 10,
        requireDistributorStock: true,
        groups: [],
    };

    it("no deja guardar una combinación que quede por debajo del costo", () => {
        expect(dailyDealSettingsSchema.safeParse(base).success).toBe(true);
        expect(dailyDealSettingsSchema.safeParse({ ...base, minMarginPercent: 10, discountPercent: 20 }).success).toBe(
            false,
        );
    });
});
