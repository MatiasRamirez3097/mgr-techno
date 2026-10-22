// Reglas de costo de envío compartidas por el checkout (front) y createOrder (back)

export const LOCAL_SHIPPING_COST = 5000;

type ShippingSize = "small" | "standard" | "bulky";

type ShippingRuleItem = {
    hasFreeShipping?: boolean;
    shippingSize?: ShippingSize | string | null;
};

export type ShippingModifierReason =
    | "none" // ningún producto con envío gratis
    | "all_free" // todos tienen envío gratis
    | "bulky" // se mezcla con un voluminoso: se anula el envío gratis
    | "all_small" // el resto son productos pequeños: se mantiene gratis
    | "mixed"; // otro caso: 50% de descuento

/**
 * Multiplicador a aplicar sobre el costo de envío (0, 0.5 o 1).
 */
export function getShippingModifier(items: ShippingRuleItem[]): {
    modifier: number;
    reason: ShippingModifierReason;
} {
    const hasFreeShippingItem = items.some((i) => i.hasFreeShipping);

    if (!hasFreeShippingItem) {
        return { modifier: 1, reason: "none" };
    }

    const nonFree = items.filter((i) => !i.hasFreeShipping);

    if (nonFree.length === 0) {
        return { modifier: 0, reason: "all_free" };
    }

    if (nonFree.some((i) => i.shippingSize === "bulky")) {
        return { modifier: 1, reason: "bulky" };
    }

    if (nonFree.every((i) => i.shippingSize === "small")) {
        return { modifier: 0, reason: "all_small" };
    }

    return { modifier: 0.5, reason: "mixed" };
}
