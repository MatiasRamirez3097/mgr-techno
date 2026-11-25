import type { RotationReason, RotationSettingsDTO } from "@/types/shared/stockRotation";

export const DEFAULT_ROTATION_SETTINGS: RotationSettingsDTO = {
    rotationSalesWindowDays: 90,
    rotationSlowCoverageDays: 90,
    rotationOldStockDays: 120,
    rotationCheaperReplacementPercent: 3,
    rotationRestockEnabled: false,
    rotationRestockCoverageDays: 7,
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Un producto (o un stock) recién llegado no tiene la ventana completa de ventas: el ritmo se
// calcula sobre los días que lleva, con este mínimo para no exagerar una venta suelta.
const MIN_EFFECTIVE_WINDOW_DAYS = 14;

export const daysBetween = (from: Date, to: Date) =>
    Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface RotationLot {
    receivedAt: Date;
    remainingQuantity: number;
    // Costo unitario con IVA (null = la compra no tiene costo cargado)
    unitCost: number | null;
}

/**
 * Lotes que cubren el stock disponible. Las unidades reservadas (pedidos todavía sin asignar)
 * salen de los lotes más viejos, como hará la asignación FIFO; si quedan más unidades en lotes
 * que stock disponible (ej: un ajuste manual), se toman los más nuevos.
 */
export function availableLots(lots: RotationLot[], reservedStock: number, availableStock: number): RotationLot[] {
    const sorted = lots
        .filter((l) => l.remainingQuantity > 0)
        .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

    let toSkip = Math.max(0, reservedStock);
    const afterReserved: RotationLot[] = [];
    for (const lot of sorted) {
        const skipped = Math.min(toSkip, lot.remainingQuantity);
        toSkip -= skipped;
        const left = lot.remainingQuantity - skipped;
        if (left > 0) afterReserved.push({ ...lot, remainingQuantity: left });
    }

    let pending = Math.max(0, availableStock);
    const result: RotationLot[] = [];
    for (const lot of afterReserved.reverse()) {
        if (pending <= 0) break;
        const qty = Math.min(pending, lot.remainingQuantity);
        result.unshift({ ...lot, remainingQuantity: qty });
        pending -= qty;
    }
    return result;
}

export interface RotationInput {
    availableStock: number;
    reservedStock: number;
    productCreatedAt: Date | null;
    // Unidades vendidas dentro de la ventana de ventas
    unitsSold: number;
    // Última venta, aunque sea anterior a la ventana (null = no se encontró ninguna)
    lastSaleAt: Date | null;
    lots: RotationLot[];
    // Mejor costo con stock de los distribuidores (ARS con IVA)
    replacementCost: number | null;
    now: Date;
}

export interface RotationMetrics {
    dailySales: number;
    coverageDays: number | null;
    oldestAgeDays: number | null;
    oldUnits: number;
    stockCost: number;
    averageUnitCost: number | null;
    unitsWithoutLots: number;
    unitsWithoutCost: number;
    replacementDiff: number | null;
    reasons: RotationReason[];
}

export function evaluateRotation(input: RotationInput, settings: RotationSettingsDTO): RotationMetrics {
    const stock = Math.max(0, input.availableStock);
    const window = settings.rotationSalesWindowDays;

    const lots = availableLots(input.lots, input.reservedStock, stock);
    const ages = lots.map((l) => daysBetween(l.receivedAt, input.now));
    const oldestAgeDays = ages.length ? Math.max(...ages) : null;

    // Desde cuándo se puede vender lo que hay: la unidad más vieja en stock (un producto creado
    // hace un año que recién recibe stock no es "lento"), o el alta del producto sin lotes.
    const productAge = input.productCreatedAt ? daysBetween(input.productCreatedAt, input.now) : null;
    const sellableDays =
        oldestAgeDays !== null ? Math.min(oldestAgeDays, productAge ?? oldestAgeDays) : productAge;

    const effectiveWindow = Math.min(window, Math.max(MIN_EFFECTIVE_WINDOW_DAYS, sellableDays ?? window));
    const dailySales = input.unitsSold / effectiveWindow;
    const coverageDays = dailySales > 0 ? Math.round(stock / dailySales) : null;

    const lotUnits = lots.reduce((s, l) => s + l.remainingQuantity, 0);
    const costed = lots.filter((l) => l.unitCost !== null && l.unitCost > 0);
    const costedUnits = costed.reduce((s, l) => s + l.remainingQuantity, 0);
    const stockCost = round2(costed.reduce((s, l) => s + l.remainingQuantity * l.unitCost!, 0));
    const averageUnitCost = costedUnits > 0 ? round2(stockCost / costedUnits) : null;
    const oldUnits = lots.reduce(
        (s, l, i) => s + (ages[i] > settings.rotationOldStockDays ? l.remainingQuantity : 0),
        0,
    );

    const replacementDiff =
        averageUnitCost && input.replacementCost && input.replacementCost > 0
            ? (input.replacementCost - averageUnitCost) / averageUnitCost
            : null;

    const reasons: RotationReason[] = [];
    if (stock > 0) {
        let slow: boolean;
        if (coverageDays !== null) {
            slow = coverageDays > settings.rotationSlowCoverageDays;
        } else {
            // Sin ventas en la ventana: lento si pasaron más días que el umbral desde la última
            // venta y desde que llegó el stock (sin datos de ninguna de las dos, también)
            const sinceLastSale = input.lastSaleAt ? daysBetween(input.lastSaleAt, input.now) : Infinity;
            const idleDays = Math.min(sinceLastSale, sellableDays ?? Infinity);
            slow = idleDays >= settings.rotationSlowCoverageDays;
        }
        if (slow) reasons.push("slow");
        if (oldUnits > 0) reasons.push("old");
        if (
            replacementDiff !== null &&
            replacementDiff < 0 &&
            replacementDiff <= -settings.rotationCheaperReplacementPercent / 100
        ) {
            reasons.push("cheaper_replacement");
        }
    }
    if (
        settings.rotationRestockEnabled &&
        input.unitsSold > 0 &&
        input.replacementCost !== null &&
        (coverageDays ?? 0) < settings.rotationRestockCoverageDays
    ) {
        reasons.push("restock");
    }

    return {
        dailySales: Math.round(dailySales * 1000) / 1000,
        coverageDays,
        oldestAgeDays,
        oldUnits,
        stockCost,
        averageUnitCost,
        unitsWithoutLots: Math.max(0, stock - lotUnits),
        unitsWithoutCost: Math.max(0, stock - costedUnits),
        replacementDiff,
        reasons,
    };
}

export const ROTATION_REASON_LABELS: Record<RotationReason, string> = {
    slow: "Stock lento",
    old: "Stock viejo",
    cheaper_replacement: "Reposición más barata",
    restock: "Reponer",
};

export const ROTATION_REASON_HINTS: Record<RotationReason, string> = {
    slow: "Al ritmo actual tarda mucho en venderse: bajá el precio, armá un combo o sumalo a Ofertas del día.",
    old: "Hay unidades paradas hace mucho: liquidalas antes de que salga el modelo nuevo.",
    cheaper_replacement:
        "Hoy el distribuidor lo vende más barato de lo que lo pagaste: vendelo antes de que bajen los precios y no compres más.",
    restock: "Se vende rápido y se está por agotar; el distribuidor tiene stock para reponer.",
};
