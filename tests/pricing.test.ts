import { describe, expect, it } from "vitest";
import {
    applyPaymentSurcharge,
    DEFAULT_MP_SURCHARGE_PERCENT,
    getFinalPrice,
    getPricing,
} from "@/lib/pricing";

describe("getFinalPrice", () => {
    it("usa el precio de oferta si es menor al regular", () => {
        expect(getFinalPrice({ regularPrice: 1000, salePrice: 800 })).toBe(800);
    });

    it("ignora una oferta nula o mayor al regular", () => {
        expect(getFinalPrice({ regularPrice: 1000, salePrice: null })).toBe(
            1000,
        );
        expect(getFinalPrice({ regularPrice: 1000, salePrice: 1200 })).toBe(
            1000,
        );
    });
});

describe("applyPaymentSurcharge", () => {
    it("aplica el 25% por defecto", () => {
        expect(DEFAULT_MP_SURCHARGE_PERCENT).toBe(25);
        expect(applyPaymentSurcharge(1000)).toBe(1250);
    });

    it("usa el porcentaje configurado y redondea a entero", () => {
        expect(applyPaymentSurcharge(1000, 10)).toBe(1100);
        expect(applyPaymentSurcharge(999, 12.5)).toBe(1124);
        expect(applyPaymentSurcharge(1000, 0)).toBe(1000);
    });
});

describe("getPricing", () => {
    it("calcula el precio de lista con el recargo recibido", () => {
        const pricing = getPricing(
            { regularPrice: 1000, salePrice: 800 },
            20,
        );
        expect(pricing.finalPrice).toBe(800);
        expect(pricing.listPrice).toBe(1200);
        expect(pricing.listPriceFinal).toBe(960);
        expect(pricing.isOnSale).toBe(true);
    });

    it("el precio de lista coincide con lo que cobra el checkout", () => {
        const product = { regularPrice: 15990, salePrice: 14990 };
        const pricing = getPricing(product, 25);
        expect(pricing.listPriceFinal).toBe(
            applyPaymentSurcharge(getFinalPrice(product), 25),
        );
    });
});
