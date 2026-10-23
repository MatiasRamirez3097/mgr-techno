import { describe, expect, it } from "vitest";
import {
    acknowledgeQuoteItemAlerts,
    countQuotePriceAlerts,
    getQuoteItemPriceAlerts,
    refreshQuoteItemCost,
    type QuotePriceContext,
} from "@/lib/quotes/priceAlerts";
import type { QuoteDTO, QuoteItemDTO } from "@/types/shared/quote";

const item: QuoteItemDTO = {
    origin: "distributor",
    distributor: "invid",
    distributorSku: "ART-001",
    name: "RTX 4060",
    quantity: 2,
    costPriceUsd: 300,
    costExchangeRate: 1000,
    costPrice: 300000,
    unitPrice: 390000,
    taxRate: 10.5,
    discount: 0,
    subtotal: 780000,
};

const ctx = (priceUsd: number, usdRate: number): QuotePriceContext => ({
    prices: { "invid:ART-001": priceUsd },
    usdRate,
});

describe("getQuoteItemPriceAlerts", () => {
    it("busca el precio actual por distribuidor y código", () => {
        const airItem = { ...item, distributor: "air", distributorSku: "39580" };
        const prices = { "invid:39580": 400, "air:39580": 330 };
        const [alert] = getQuoteItemPriceAlerts(airItem, { prices, usdRate: 1000 });
        expect(alert.current).toBe(330);
        expect(getQuoteItemPriceAlerts(item, { prices, usdRate: 1000 })).toEqual([]);
    });

    it("no avisa si el costo varió menos de 2% y el dólar subió menos de 10%", () => {
        expect(getQuoteItemPriceAlerts(item, ctx(305, 1090))).toEqual([]);
    });

    it("avisa cambios de costo de 2% o más en cualquier sentido", () => {
        const [up] = getQuoteItemPriceAlerts(item, ctx(306, 1000));
        expect(up.type).toBe("cost");
        expect(up.change).toBeCloseTo(0.02);
        expect(getQuoteItemPriceAlerts(item, ctx(290, 1000))[0].type).toBe("cost");
    });

    it("avisa sólo subas del dólar de 10% o más", () => {
        expect(getQuoteItemPriceAlerts(item, ctx(300, 1100))[0].type).toBe("exchange_rate");
        expect(getQuoteItemPriceAlerts(item, ctx(300, 800))).toEqual([]);
    });

    it("ignora ítems sin costo en dólares o sin precio actual", () => {
        expect(getQuoteItemPriceAlerts({ ...item, costPriceUsd: undefined }, ctx(400, 2000))).toEqual(
            [],
        );
        expect(
            getQuoteItemPriceAlerts(item, { prices: {}, usdRate: null }),
        ).toEqual([]);
    });

    it("una alerta ignorada vuelve sólo si el valor cambia otra vez", () => {
        const acked = acknowledgeQuoteItemAlerts(item, ctx(330, 1200));
        expect(getQuoteItemPriceAlerts(acked, ctx(330, 1200))).toEqual([]);
        expect(getQuoteItemPriceAlerts(acked, ctx(335, 1250))).toEqual([]);
        expect(getQuoteItemPriceAlerts(acked, ctx(340, 1200)).map((a) => a.type)).toEqual(["cost"]);
        expect(getQuoteItemPriceAlerts(acked, ctx(330, 1320)).map((a) => a.type)).toEqual([
            "exchange_rate",
        ]);
    });
});

describe("refreshQuoteItemCost", () => {
    it("actualiza costo y cotización manteniendo el margen", () => {
        const updated = refreshQuoteItemCost(item, ctx(330, 1100));
        expect(updated.costPriceUsd).toBe(330);
        expect(updated.costExchangeRate).toBe(1100);
        expect(updated.costPrice).toBe(363000);
        // margen original: 390000 / 300000 = 1.3
        expect(updated.unitPrice).toBe(471900);
        expect(updated.subtotal).toBe(943800);
        expect(getQuoteItemPriceAlerts(updated, ctx(330, 1100))).toEqual([]);
    });
});

describe("countQuotePriceAlerts", () => {
    const quote = { status: "sent", items: [item, { ...item, distributorSku: "OTRO" }] } as QuoteDTO;

    it("cuenta los ítems con alertas sólo en presupuestos abiertos", () => {
        expect(countQuotePriceAlerts(quote, ctx(350, 1000))).toBe(1);
        expect(countQuotePriceAlerts({ ...quote, status: "converted" }, ctx(350, 1000))).toBe(0);
        expect(countQuotePriceAlerts({ ...quote, status: "expired" }, ctx(350, 1000))).toBe(0);
    });
});
