import type { DistributorKey } from "@/types/shared/distributorLink";
import type {
    DailyDealDiscountTier,
    DailyDealExclusionReason,
    DailyDealGroupDTO,
    DailyDealGroupStats,
    DailyDealSettingsDTO,
} from "@/types/shared/dailyDeals";

/**
 * Motor de las ofertas del día: funciones puras (sin base de datos) para decidir qué productos
 * pueden participar, a qué precio y cuáles salen sorteados.
 */

export const DEFAULT_DAILY_DEAL_SETTINGS: DailyDealSettingsDTO = {
    enabled: false,
    productCount: 6,
    noRepeatDays: 7,
    discountTiers: [{ minMarginPercent: 30, discountPercent: 10 }],
    requireDistributorStock: true,
    startDate: null,
    groups: [],
    prioritizeRotation: false,
    rotationOwnDiscounts: false,
    rotationDiscountTiers: [
        { minMarginPercent: 15, discountPercent: 12 },
        { minMarginPercent: 30, discountPercent: 20 },
    ],
    rotationMinDealMarginPercent: 0,
};

// Límite del piso de utilidad del stock a rotar (y de la utilidad mínima de sus escalones)
export const ROTATION_MIN_MARGIN_LIMIT = -90;

/**
 * Utilidad que queda después del descuento para un producto que tenía `marginPercent` antes:
 * precio = costo × (1 + m); con descuento d, precio × (1 − d) → utilidad (1 + m)(1 − d) − 1.
 * Ej: 30% de utilidad y 10% de descuento → 17%.
 */
export function marginAfterDiscount(marginPercent: number, discountPercent: number): number {
    return ((1 + marginPercent / 100) * (1 - discountPercent / 100) - 1) * 100;
}

/**
 * Precio de oferta: precio normal menos el descuento, redondeado hacia abajo con el paso de
 * redondeo de precios (para que el descuento nunca sea menor al anunciado). null si no queda un
 * precio válido (cero o no menor al normal).
 */
export function computeDealPrice(regularPrice: number, discountPercent: number, roundingStep: number): number | null {
    const step = roundingStep > 0 ? roundingStep : 1;
    const raw = regularPrice * (1 - discountPercent / 100);
    const rounded = Math.floor(raw / step) * step;
    return rounded > 0 && rounded < regularPrice ? rounded : null;
}

export interface DealCostOption {
    distributor: DistributorKey;
    price: number | null;
    // Stock en el distribuidor (PCMODD, con "Stock sin informar", cuenta como con stock)
    inStock: boolean;
    // false si el ítem ya no está en el catálogo del distribuidor
    available: boolean;
}

export interface DealCost {
    cost: number;
    // null: costo de compra del stock propio
    distributor: DistributorKey | null;
    inStock: boolean;
    // Distribuidores con costo utilizable (con stock, o cualquiera si no se exige stock)
    distributors: DistributorKey[];
}

/**
 * Costo para la oferta: el menor entre los distribuidores con stock. Si no se exige stock y
 * ninguno tiene, el menor último precio conocido. null si no hay costo utilizable.
 */
export function pickDealCost(options: DealCostOption[], requireStock: boolean): DealCost | null {
    const known = options.filter((o) => o.available && typeof o.price === "number" && o.price > 0);
    const withStock = known.filter((o) => o.inStock);
    const usable = withStock.length > 0 ? withStock : requireStock ? [] : known;
    if (usable.length === 0) return null;
    const best = usable.reduce((a, b) => (b.price! < a.price! ? b : a));
    return {
        cost: best.price!,
        distributor: best.distributor,
        inStock: withStock.length > 0,
        distributors: [...new Set(usable.map((o) => o.distributor))],
    };
}

export interface DealProductInput {
    regularPrice: number;
    salePrice?: number | null;
    costs: DealCostOption[];
}

/** Ordena los escalones por utilidad mínima creciente */
export function sortDiscountTiers(tiers: DailyDealDiscountTier[]): DailyDealDiscountTier[] {
    return [...tiers].sort((a, b) => a.minMarginPercent - b.minMarginPercent);
}

/** Escalón más alto que alcanza una utilidad (antes del descuento); null si no llega al más bajo */
export function pickDiscountTier(tiers: DailyDealDiscountTier[], marginPercent: number): DailyDealDiscountTier | null {
    let best: DailyDealDiscountTier | null = null;
    for (const tier of tiers) {
        if (marginPercent >= tier.minMarginPercent && (!best || tier.minMarginPercent > best.minMarginPercent)) {
            best = tier;
        }
    }
    return best;
}

export type DealEvaluation =
    | { eligible: false; reason: DailyDealExclusionReason }
    | {
          eligible: true;
          cost: DealCost;
          dealPrice: number;
          discountPercent: number;
          marginPercent: number;
          dealMarginPercent: number;
      };

type EvaluationSettings = Pick<DailyDealSettingsDTO, "discountTiers" | "requireDistributorStock">;

const hasSalePrice = (product: DealProductInput) => product.salePrice != null && product.salePrice > 0;

/** Escalón y precio de oferta sobre un costo ya elegido; `minDealMarginPercent` es el piso final. */
function priceWithTiers(
    regularPrice: number,
    cost: DealCost,
    tiers: DailyDealDiscountTier[],
    roundingStep: number,
    minDealMarginPercent = -Infinity,
): DealEvaluation {
    const marginPercent = ((regularPrice - cost.cost) / cost.cost) * 100;
    const tier = pickDiscountTier(tiers, marginPercent);
    if (!tier) return { eligible: false, reason: "low_margin" };

    const dealPrice = computeDealPrice(regularPrice, tier.discountPercent, roundingStep);
    if (dealPrice === null) return { eligible: false, reason: "no_deal_price" };

    const dealMarginPercent = ((dealPrice - cost.cost) / cost.cost) * 100;
    // El redondeo hacia abajo puede pasar apenas el piso
    if (dealMarginPercent < minDealMarginPercent) return { eligible: false, reason: "low_margin" };

    return { eligible: true, cost, dealPrice, discountPercent: tier.discountPercent, marginPercent, dealMarginPercent };
}

/** Decide si un producto puede participar y, si puede, a qué precio y con qué utilidad. */
export function evaluateDealProduct(
    product: DealProductInput,
    settings: EvaluationSettings,
    roundingStep: number,
): DealEvaluation {
    // Una oferta cargada a mano no se pisa
    if (hasSalePrice(product)) return { eligible: false, reason: "on_sale" };

    const hasKnownCost = product.costs.some((c) => c.available && typeof c.price === "number" && c.price > 0);
    if (!hasKnownCost) return { eligible: false, reason: "no_cost" };

    const cost = pickDealCost(product.costs, settings.requireDistributorStock);
    if (!cost) return { eligible: false, reason: "no_stock" };

    return priceWithTiers(product.regularPrice, cost, settings.discountTiers, roundingStep);
}

export type RotationDealRules = Pick<DailyDealSettingsDTO, "rotationDiscountTiers" | "rotationMinDealMarginPercent">;

/**
 * Igual que evaluateDealProduct, con los descuentos propios del stock a rotar: la utilidad se
 * mide sobre lo que se pagó por el stock (`stockUnitCost`, con IVA) y, si no se conoce, sobre el
 * último costo de un distribuidor. No hace falta stock en el distribuidor (se vende el propio).
 */
export function evaluateRotationDealProduct(
    product: DealProductInput & { stockUnitCost: number | null },
    rules: RotationDealRules,
    roundingStep: number,
): DealEvaluation {
    if (hasSalePrice(product)) return { eligible: false, reason: "on_sale" };

    const known = pickDealCost(product.costs, false);
    const cost: DealCost | null =
        product.stockUnitCost && product.stockUnitCost > 0
            ? { cost: product.stockUnitCost, distributor: null, inStock: true, distributors: known?.distributors ?? [] }
            : known && { ...known, inStock: true };
    if (!cost) return { eligible: false, reason: "no_cost" };

    return priceWithTiers(
        product.regularPrice,
        cost,
        rules.rotationDiscountTiers,
        roundingStep,
        rules.rotationMinDealMarginPercent,
    );
}

export interface DealCandidate {
    productId: string;
    // Categorías propias del producto (sin ancestros)
    categoryIds: string[];
    brandId: string | null;
    // Distribuidores con costo utilizable
    distributors: DistributorKey[];
    // Última vez que salió en oferta (YYYY-MM-DD), null si nunca
    lastFeaturedOn: string | null;
    // Está en "Stock a rotar" (para los grupos que piden sólo esos)
    rotation?: boolean;
    // Se sortea antes que el resto de su grupo (ej: stock a rotar con la prioridad activada)
    priority?: boolean;
}

/**
 * Grupo listo para comparar: `categoryIds` ya incluye las subcategorías de las elegidas
 * (ver expandCategoryIds).
 */
export type ResolvedDealGroup = DailyDealGroupDTO;

export const ALL_PRODUCTS_GROUP: ResolvedDealGroup = {
    id: "all",
    name: "Todo el catálogo",
    distributors: [],
    categoryIds: [],
    brandIds: [],
    onlyRotation: false,
    maxProducts: null,
};

/** Un filtro vacío no restringe; con valores, el producto tiene que tener alguno de ellos. */
export function matchesDealGroup(candidate: DealCandidate, group: ResolvedDealGroup): boolean {
    if (group.onlyRotation && !candidate.rotation) return false;
    if (group.distributors.length > 0 && !candidate.distributors.some((d) => group.distributors.includes(d))) {
        return false;
    }
    if (group.categoryIds.length > 0) {
        const categories = new Set(group.categoryIds);
        if (!candidate.categoryIds.some((c) => categories.has(c))) return false;
    }
    if (group.brandIds.length > 0 && (!candidate.brandId || !group.brandIds.includes(candidate.brandId))) {
        return false;
    }
    return true;
}

/** Días entre dos fechas YYYY-MM-DD (b − a). */
export function daysBetween(a: string, b: string): number {
    return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Salió dentro de los últimos `noRepeatDays` días (sin contar hoy) */
export function isRecentlyFeatured(lastFeaturedOn: string | null, today: string, noRepeatDays: number): boolean {
    if (!lastFeaturedOn || noRepeatDays <= 0) return false;
    const days = daysBetween(lastFeaturedOn, today);
    return days >= 1 && days <= noRepeatDays;
}

/** Categorías elegidas más todas sus subcategorías, a partir del árbol completo. */
export function expandCategoryIds(
    selected: string[],
    categories: { id: string; parentId: string | null }[],
): string[] {
    const children = new Map<string, string[]>();
    for (const c of categories) {
        if (c.parentId) children.set(c.parentId, [...(children.get(c.parentId) ?? []), c.id]);
    }
    const result = new Set<string>();
    const stack = [...selected];
    while (stack.length > 0) {
        const id = stack.pop()!;
        if (result.has(id)) continue;
        result.add(id);
        stack.push(...(children.get(id) ?? []));
    }
    return [...result];
}

function shuffle<T>(items: T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export interface DealPick {
    productId: string;
    groupId: string;
    repeated: boolean;
}

/**
 * Sorteo del día. Los grupos se llenan en orden, cada uno hasta su cupo y entre todos hasta
 * `count`. Primero con productos que no salieron en los últimos `noRepeatDays` días; si no
 * alcanzan, se completa (con el mismo orden y cupos) con los que salieron hace más tiempo.
 * Sin grupos, participa todo lo elegible.
 */
export function selectDailyDeals<C extends DealCandidate>({
    candidates,
    groups,
    count,
    noRepeatDays,
    today,
    random = Math.random,
}: {
    candidates: C[];
    groups: ResolvedDealGroup[];
    count: number;
    noRepeatDays: number;
    today: string;
    random?: () => number;
}): { picks: DealPick[]; groups: DailyDealGroupStats[] } {
    const orderedGroups = groups.length > 0 ? groups : [ALL_PRODUCTS_GROUP];
    const chosen = new Set<string>();
    const picks: DealPick[] = [];
    const remainingQuota = new Map(orderedGroups.map((g) => [g.id, g.maxProducts ?? Infinity]));
    const matchingByGroup = new Map(orderedGroups.map((g) => [g.id, candidates.filter((c) => matchesDealGroup(c, g))]));
    const isRecent = (c: C) => isRecentlyFeatured(c.lastFeaturedOn, today, noRepeatDays);

    const fill = (repeated: boolean) => {
        for (const group of orderedGroups) {
            if (picks.length >= count) return;
            const pool = matchingByGroup.get(group.id)!.filter((c) => !chosen.has(c.productId) && isRecent(c) === repeated);
            // Entre los repetidos, primero los que salieron hace más tiempo (al azar si empatan).
            // Los prioritarios van antes que el resto en los dos casos (sort es estable).
            const ordered = (
                repeated
                    ? shuffle(pool, random).sort((a, b) => (a.lastFeaturedOn ?? "").localeCompare(b.lastFeaturedOn ?? ""))
                    : shuffle(pool, random)
            ).sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)));
            for (const candidate of ordered) {
                if (picks.length >= count || remainingQuota.get(group.id)! <= 0) break;
                chosen.add(candidate.productId);
                picks.push({ productId: candidate.productId, groupId: group.id, repeated });
                remainingQuota.set(group.id, remainingQuota.get(group.id)! - 1);
            }
        }
    };
    fill(false);
    fill(true);

    return {
        picks,
        groups: orderedGroups.map((g) => {
            const matching = matchingByGroup.get(g.id)!;
            return {
                groupId: g.id,
                groupName: g.name,
                matching: matching.length,
                fresh: matching.filter((c) => !isRecent(c)).length,
                picked: picks.filter((p) => p.groupId === g.id).length,
            };
        }),
    };
}
