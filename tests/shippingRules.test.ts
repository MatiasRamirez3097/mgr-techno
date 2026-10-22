import { describe, expect, it } from "vitest";
import { getShippingModifier } from "@/lib/shipping/shippingRules";

const free = { hasFreeShipping: true, shippingSize: "standard" };

describe("getShippingModifier", () => {
    it("cobra el 100% si ningún producto tiene envío gratis", () => {
        expect(
            getShippingModifier([
                { hasFreeShipping: false, shippingSize: "small" },
            ]),
        ).toEqual({ modifier: 1, reason: "none" });
    });

    it("es gratis si todos tienen envío gratis", () => {
        expect(getShippingModifier([free, free])).toEqual({
            modifier: 0,
            reason: "all_free",
        });
    });

    it("anula el envío gratis si se mezcla con un voluminoso", () => {
        expect(
            getShippingModifier([
                free,
                { hasFreeShipping: false, shippingSize: "bulky" },
            ]),
        ).toEqual({ modifier: 1, reason: "bulky" });
    });

    it("mantiene gratis si el resto son pequeños", () => {
        expect(
            getShippingModifier([
                free,
                { hasFreeShipping: false, shippingSize: "small" },
            ]),
        ).toEqual({ modifier: 0, reason: "all_small" });
    });

    it("aplica 50% en cualquier otra combinación", () => {
        expect(
            getShippingModifier([
                free,
                { hasFreeShipping: false, shippingSize: "standard" },
            ]),
        ).toEqual({ modifier: 0.5, reason: "mixed" });
    });
});
