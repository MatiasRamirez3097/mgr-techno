import { describe, expect, it } from "vitest";
import { parseQuoteItems } from "@/lib/validators/quoteItemsSchema";
import { mapQuoteItemsToOrderItems } from "@/lib/quotes/mapQuoteItemsToOrderItems";
import { calculateQuoteTotals } from "@/services/quotes/calculateQuoteTotals";
import {
    countQuotePriceAlerts,
    getCustomPcComponentAlerts,
    resolveCustomPcComponentAlert,
    type QuotePriceContext,
} from "@/lib/quotes/priceAlerts";
import type { QuoteComponentDTO, QuoteDTO, QuoteItemDTO } from "@/types/shared/quote";

const invidGpu: QuoteComponentDTO = {
    origin: "distributor",
    distributor: "invid",
    distributorSku: "ART-001",
    name: "RTX 4060",
    quantity: 1,
    costPriceUsd: 300,
    costExchangeRate: 1000,
    costPrice: 300000,
    unitPrice: 390000,
    taxRate: 10.5,
};

const internalCpu: QuoteComponentDTO = {
    origin: "internal",
    productId: "64b000000000000000000001",
    name: "Ryzen 5 5600",
    quantity: 1,
    costPrice: 0,
    unitPrice: 200000,
    taxRate: 10.5,
};

const pc = (components: QuoteComponentDTO[]): QuoteItemDTO => ({
    origin: "manual",
    isCustomPc: true,
    components,
    name: "PC Gamer",
    quantity: 2,
    unitPrice: 600000,
    taxRate: 10.5,
    discount: 0,
    subtotal: 1200000,
});

const ctx = (priceUsd: number, usdRate: number): QuotePriceContext => ({
    prices: { "invid:ART-001": priceUsd },
    usdRate,
});

describe("parseQuoteItems", () => {
    it("rechaza una PC Armada sin componentes", () => {
        expect(() => parseQuoteItems([pc([])])).toThrow(/al menos un componente/);
    });

    it("rechaza componentes sin nombre", () => {
        expect(() => parseQuoteItems([pc([{ ...internalCpu, name: "  " }])])).toThrow(
            /componentes de la PC Armada deben tener nombre/,
        );
    });

    it("conserva los campos del ítem y limpia componentes de ítems comunes", () => {
        const [parsed, plain] = parseQuoteItems([
            pc([internalCpu, invidGpu]),
            { origin: "manual", name: "Armado", quantity: 1, unitPrice: 10, taxRate: 21, components: [internalCpu] },
        ]);
        expect(parsed.isCustomPc).toBe(true);
        expect(parsed.components).toHaveLength(2);
        expect(parsed.components?.[1].costPriceUsd).toBe(300);
        expect(parsed.unitPrice).toBe(600000);
        expect(plain.isCustomPc).toBe(false);
        expect(plain.components).toEqual([]);
    });
});

describe("calculateQuoteTotals con PC Armada", () => {
    it("usa el precio de la PC, no la suma de los componentes", () => {
        const { total } = calculateQuoteTotals([pc([internalCpu, invidGpu])]);
        expect(total).toBe(1200000);
    });
});

describe("alertas en componentes", () => {
    it("detecta alertas por componente y cuenta la PC una sola vez", () => {
        const item = pc([internalCpu, invidGpu]);
        const alerts = getCustomPcComponentAlerts(item, ctx(330, 1000));
        expect(alerts[0]).toEqual([]);
        expect(alerts[1].map((a) => a.type)).toEqual(["cost"]);

        const quote = { status: "sent", items: [item] } as QuoteDTO;
        expect(countQuotePriceAlerts(quote, ctx(330, 1000))).toBe(1);
    });

    it("actualiza el costo del componente sin tocar el precio de la PC", () => {
        const item = pc([internalCpu, invidGpu]);
        const updated = resolveCustomPcComponentAlert(item, 1, "refresh", ctx(330, 1100));
        expect(updated.components?.[1].costPrice).toBe(363000);
        expect(updated.components?.[1].unitPrice).toBe(471900);
        expect(updated.unitPrice).toBe(600000);
        expect(getCustomPcComponentAlerts(updated, ctx(330, 1100))[1]).toEqual([]);
    });

    it("ignorar registra los valores vigentes", () => {
        const updated = resolveCustomPcComponentAlert(pc([invidGpu]), 0, "ignore", ctx(330, 1000));
        expect(updated.components?.[0].alertAckPriceUsd).toBe(330);
        expect(getCustomPcComponentAlerts(updated, ctx(330, 1000))[0]).toEqual([]);
    });
});

describe("mapQuoteItemsToOrderItems", () => {
    it("convierte la PC Armada en un ítem isCustomPc con sus componentes", () => {
        const [orderItem] = mapQuoteItemsToOrderItems([pc([{ ...internalCpu, quantity: 2 }])], 1);
        expect(orderItem).toEqual({
            productId: "",
            name: "PC Gamer",
            quantity: 2,
            unitPrice: 600000,
            taxRate: 10.5,
            isCustomPc: true,
            customComponents: [{ productId: internalCpu.productId, name: "Ryzen 5 5600", quantity: 2 }],
        });
    });

    it("aplica la cotización en presupuestos en USD", () => {
        const [orderItem] = mapQuoteItemsToOrderItems(
            [{ ...pc([internalCpu]), subtotal: 1000 }],
            1200,
        );
        expect(orderItem.unitPrice).toBe(600000);
    });

    it("bloquea componentes que no están en el catálogo", () => {
        expect(() => mapQuoteItemsToOrderItems([pc([internalCpu, invidGpu])])).toThrow(
            /"RTX 4060" \(componente de "PC Gamer"\)/,
        );
    });

    it("bloquea ítems sueltos sin producto como antes", () => {
        expect(() =>
            mapQuoteItemsToOrderItems([{ name: "Servicio", quantity: 1, subtotal: 10 }]),
        ).toThrow(/"Servicio"/);
    });
});
