import type { PricingSettingsDTO } from "@/types/shared/settings";

export const DEFAULT_PRICING_SETTINGS: PricingSettingsDTO = {
    targetMarginPercent: 20,
    minMarginPercent: 10,
    priceRoundingStep: 100,
};

export interface CategoryMarginNode {
    id: string;
    name: string;
    parentId: string | null;
    targetMarginPercent?: number | null;
    minMarginPercent?: number | null;
}

export interface ResolvedMargins {
    targetMarginPercent: number;
    minMarginPercent: number;
    // Categoría de la que salió cada margen (null = configuración general)
    targetSource: string | null;
    minSource: string | null;
}

const isSet = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Márgenes de un producto: para cada una de sus categorías (en orden) se sube por la
 * jerarquía hasta encontrar una que defina el margen; si ninguna lo hace, se usa el general.
 * El objetivo y el mínimo se resuelven por separado.
 */
export function resolveMargins(
    categoryIds: string[],
    categories: Map<string, CategoryMarginNode>,
    defaults: Pick<PricingSettingsDTO, "targetMarginPercent" | "minMarginPercent">,
): ResolvedMargins {
    const find = (field: "targetMarginPercent" | "minMarginPercent") => {
        for (const id of categoryIds) {
            const visited = new Set<string>();
            let node = categories.get(id);
            while (node && !visited.has(node.id)) {
                visited.add(node.id);
                if (isSet(node[field])) return { value: node[field] as number, source: node.name };
                node = node.parentId ? categories.get(node.parentId) : undefined;
            }
        }
        return { value: defaults[field], source: null };
    };

    const target = find("targetMarginPercent");
    const min = find("minMarginPercent");
    return {
        targetMarginPercent: target.value,
        // Una categoría con objetivo menor que el mínimo general no debe quedar siempre "bajo mínimo"
        minMarginPercent: Math.min(min.value, target.value),
        targetSource: target.source,
        minSource: min.source,
    };
}

/** Precio sugerido: costo × (1 + margen objetivo), redondeado hacia arriba al múltiplo indicado. */
export function suggestPrice(cost: number, targetMarginPercent: number, roundingStep: number): number {
    const raw = cost * (1 + targetMarginPercent / 100);
    const step = Math.max(1, roundingStep);
    // El epsilon evita subir un escalón por errores de coma flotante (ej: 1100.0000000002)
    return Math.ceil(raw / step - 1e-9) * step;
}

export type MarginStatus = "below_min" | "below_target" | "ok" | "no_cost";

/** Estado del margen (fracción, 0.2 = 20%) respecto del mínimo y el objetivo (en %). */
export function getMarginStatus(
    margin: number | null,
    minMarginPercent: number,
    targetMarginPercent: number,
): MarginStatus {
    if (margin === null) return "no_cost";
    // Redondeo a 0,1% para que un precio sugerido redondeado no quede "debajo" por decimales
    const percent = Math.round(margin * 1000) / 10;
    if (percent < minMarginPercent) return "below_min";
    if (percent < targetMarginPercent) return "below_target";
    return "ok";
}

export interface CostCandidate<D extends string = string> {
    distributor: D;
    price: number | null;
    inStock: boolean;
    available: boolean;
}

/**
 * Comparación de un producto: mejor costo con stock (entre ítems disponibles), margen
 * sobre ese costo, estado y precio sugerido.
 */
export function comparePriceWithCosts<D extends string>(input: {
    effectivePrice: number;
    costs: CostCandidate<D>[];
    targetMarginPercent: number;
    minMarginPercent: number;
    roundingStep: number;
}): {
    bestCost: number | null;
    bestDistributor: D | null;
    margin: number | null;
    marginStatus: MarginStatus;
    suggestedPrice: number | null;
} {
    let best: CostCandidate<D> | null = null;
    for (const c of input.costs) {
        if (!c.available || !c.inStock || !c.price || c.price <= 0) continue;
        if (!best || c.price < best.price!) best = c;
    }
    const bestCost = best?.price ?? null;
    const margin = bestCost ? (input.effectivePrice - bestCost) / bestCost : null;
    return {
        bestCost,
        bestDistributor: best?.distributor ?? null,
        margin,
        marginStatus: getMarginStatus(margin, input.minMarginPercent, input.targetMarginPercent),
        suggestedPrice: bestCost ? suggestPrice(bestCost, input.targetMarginPercent, input.roundingStep) : null,
    };
}

/**
 * Cómo aplicar un nuevo precio final: si el producto tiene una oferta vigente y el precio
 * nuevo sigue por debajo del regular, se cambia la oferta; si no, se cambia el regular y se
 * quita la oferta.
 */
export function buildPriceUpdate(
    current: { regularPrice: number; salePrice?: number | null },
    newPrice: number,
): { regularPrice: number; salePrice: number | null } {
    const hasActiveSale =
        current.salePrice != null && current.salePrice > 0 && current.salePrice < current.regularPrice;
    if (hasActiveSale && newPrice < current.regularPrice) {
        return { regularPrice: current.regularPrice, salePrice: newPrice };
    }
    return { regularPrice: newPrice, salePrice: null };
}
