import { beforeEach, describe, expect, it, vi } from "vitest";
import { elitPageOffsets, mapElitProduct } from "@/lib/distributors/elitMapper";
import { buildNewBytesProductUrl, mapNewBytesProduct } from "@/lib/distributors/newbytesMapper";
import { buildLinkSnapshotUpdate } from "@/lib/distributors/productLinks";
import {
    buildPriceAlertDigest,
    selectNewlyBelowMin,
    selectSignificantChanges,
} from "@/lib/priceAlertsDigest";

import { fetchElitProductsByIds } from "@/services/distributors/elit/fetchElitProductsByIds";

type ElitParams = Record<string, string | number>;
const { requestElitProducts } = vi.hoisted(() => ({
    requestElitProducts: vi.fn<(params: ElitParams) => Promise<{ items: unknown[]; total: number | null }>>(),
}));
vi.mock("@/services/distributors/elit/requestElitProducts", () => ({ requestElitProducts }));

describe("mappers de Elit y NewBytes", () => {
    it("Elit: pvp_ars es el costo con IVA en pesos", () => {
        expect(
            mapElitProduct({
                id: 21049,
                codigo_producto: "C2RD3AT",
                nombre: "AIO 24",
                marca: "HP",
                pvp_ars: 1650085.7,
                iva: 10.5,
                stock_total: 0,
                imagenes: ["https://img/1.jpg"],
                link: "https://elit/p",
            }),
        ).toEqual({
            id: 21049,
            distributor: "Elit",
            sku: "C2RD3AT",
            name: "HP AIO 24",
            price: 1650085.7,
            stock: 0,
            image: "https://img/1.jpg",
            link: "https://elit/p",
            taxRate: 10.5,
        });
    });

    it("Elit: páginas con offset desde 1, de a 100", () => {
        expect(elitPageOffsets(1806)).toEqual([
            1, 101, 201, 301, 401, 501, 601, 701, 801, 901, 1001, 1101, 1201, 1301, 1401, 1501, 1601, 1701, 1801,
        ]);
        expect(elitPageOffsets(0)).toEqual([]);
    });

    it("NewBytes: finalPrice (USD c/IVA) por la cotización", () => {
        const product = mapNewBytesProduct({
            id: 118720,
            sku: "DAP-2610",
            title: "Access Point D-Link DAP-2610",
            amountStock: 10,
            cotizacion: 1570,
            price: { finalPrice: 110.564532, iva: 10.5 },
        });
        expect(product.price).toBeCloseTo(173586.32, 1);
        expect(product).toMatchObject({ distributor: "NewBytes", sku: "DAP-2610", stock: 10, taxRate: 10.5 });
        expect(buildNewBytesProductUrl("Mouse Logitech G203", 5)).toBe("https://www.nb.com.ar/mouse-logitech-g203_-_5");
    });
});

describe("buildLinkSnapshotUpdate", () => {
    const now = new Date("2026-11-16T10:00:00Z");
    const item = { name: "RTX 4060", price: 330000, stock: 3, link: "https://x", image: null };

    it("registra el cambio de costo", () => {
        const { set, priceChange } = buildLinkSnapshotUpdate({ lastPrice: 300000 }, item, now);
        expect(set).toMatchObject({ lastPrice: 330000, lastStock: 3, previousPrice: 300000, priceChangedAt: now, missingSince: null });
        expect(priceChange?.change).toBeCloseTo(0.1);
    });

    it("ignora variaciones menores a 0,5%", () => {
        const { set, priceChange } = buildLinkSnapshotUpdate({ lastPrice: 329000 }, item, now);
        expect(priceChange).toBeNull();
        expect(set).not.toHaveProperty("previousPrice");
    });

    it("sin costo anterior no hay cambio", () => {
        expect(buildLinkSnapshotUpdate({ lastPrice: null }, item, now).priceChange).toBeNull();
    });

    it("producto que ya no está: conserva la fecha en que desapareció", () => {
        const since = new Date("2026-11-10T10:00:00Z");
        expect(buildLinkSnapshotUpdate({ lastPrice: 1, missingSince: null }, null, now).set).toMatchObject({
            missingSince: now,
            lastStock: 0,
        });
        expect(buildLinkSnapshotUpdate({ lastPrice: 1, missingSince: since }, null, now).set.missingSince).toBe(since);
    });
});

describe("fetchElitProductsByIds", () => {
    const raw = (id: number) => ({ id, nombre: `P${id}`, pvp_ars: id * 10, stock_total: 1 });

    beforeEach(() => {
        requestElitProducts.mockReset();
    });

    it("pocos IDs: consulta uno por uno y confirma los que no existen", async () => {
        requestElitProducts.mockImplementation(async (p) => ({ items: p.id === "2" ? [] : [raw(Number(p.id))], total: 1 }));
        const result = await fetchElitProductsByIds(["1", "2", "3"]);
        expect([...result.found.keys()].sort()).toEqual(["1", "3"]);
        expect([...result.missing]).toEqual(["2"]);
        expect(result.requests).toBe(3);
    });

    it("un error en una consulta por ID no marca el producto como faltante", async () => {
        requestElitProducts.mockRejectedValue(new Error("HTTP 500"));
        const result = await fetchElitProductsByIds(["1"]);
        expect(result.missing.size).toBe(0);
        expect(result.errors).toHaveLength(1);
    });

    // Catálogo simulado de 1.000 productos (IDs 1..1000), 100 por página
    const catalog = async (p: ElitParams) => ({
        items: Array.from({ length: 100 }, (_, i) => raw(Number(p.offset) + i)).filter((p) => p.id <= 1000),
        total: 1000,
    });

    it("muchos IDs: recorre páginas y corta cuando encontró todos", async () => {
        requestElitProducts.mockImplementation(catalog);
        const ids = Array.from({ length: 25 }, (_, i) => String(i + 1)).concat("250");
        const result = await fetchElitProductsByIds(ids);
        expect(result.found.size).toBe(26);
        expect(result.requests).toBe(3);
        expect(requestElitProducts.mock.calls.map(([p]) => p.offset)).toEqual([1, 101, 201]);
    });

    it("recorrido completo: lo que no apareció falta", async () => {
        requestElitProducts.mockImplementation(catalog);
        const ids = Array.from({ length: 25 }, (_, i) => String(i + 1)).concat("99999");
        const result = await fetchElitProductsByIds(ids);
        expect(result.requests).toBe(10);
        expect([...result.missing]).toEqual(["99999"]);
    });

    it("si una página falla no marca faltantes", async () => {
        requestElitProducts.mockImplementation(async (p) => {
            if (p.offset === 301) throw new Error("timeout");
            return catalog(p);
        });
        const ids = Array.from({ length: 25 }, (_, i) => String(i + 1)).concat("99999");
        const result = await fetchElitProductsByIds(ids);
        expect(result.missing.size).toBe(0);
        expect(result.errors[0]).toContain("offset 301");
    });
});

describe("aviso diario", () => {
    const row = (id: string, name = `Producto ${id}`) => ({
        productId: id,
        name,
        effectivePrice: 105000,
        bestCost: 100000,
        margin: 0.05,
        minMarginPercent: 10,
    });

    it("sólo avisa los productos nuevos bajo el mínimo", () => {
        expect(selectNewlyBelowMin([row("a"), row("b")], ["a"]).map((r) => r.productId)).toEqual(["b"]);
    });

    it("cambios de costo de 5% o más, los mayores primero", () => {
        const changes = [{ change: 0.02 }, { change: -0.08 }, { change: 0.05 }, { change: 0.3 }];
        expect(selectSignificantChanges(changes).map((c) => c.change)).toEqual([0.3, -0.08, 0.05]);
    });

    it("no manda nada si no hay novedades", () => {
        expect(buildPriceAlertDigest({ newlyBelowMin: [], totalBelowMin: 4, costChanges: [], reviewUrl: "x" })).toBeNull();
    });

    it("arma el mensaje con totales, el detalle y el link", () => {
        const digest = buildPriceAlertDigest({
            newlyBelowMin: [row("a", "RTX 4060")],
            totalBelowMin: 7,
            costChanges: [{ productName: "Ryzen 5", distributor: "Elit", change: 0.12 }],
            reviewUrl: "https://mgr/admin/comparator/pricing?view=below_min",
        });
        expect(digest?.description).toContain("1 producto(s) nuevos bajo el margen mínimo** (7 en total)");
        expect(digest?.description).toContain("RTX 4060: $105.000 vs costo $100.000 (margen +5%, mín. 10%)");
        expect(digest?.description).toContain("Ryzen 5 (Elit): +12%");
        expect(digest?.description).toContain("(https://mgr/admin/comparator/pricing?view=below_min)");
    });

    it("respeta el límite de Discord y resume el resto", () => {
        const many = Array.from({ length: 50 }, (_, i) => row(String(i), "x".repeat(300)));
        const digest = buildPriceAlertDigest({ newlyBelowMin: many, totalBelowMin: 50, costChanges: [], reviewUrl: "u" });
        expect(digest!.description.length).toBeLessThanOrEqual(4096);
        expect(digest!.description).toContain("… y 40 más");
    });
});
