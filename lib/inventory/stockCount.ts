import type { ExpectedStock, StockCountReason, StockCountSettingsDTO } from "@/types/shared/stockCount";

/** Conteo rotativo de stock: funciones puras (sin base de datos). */

export const DEFAULT_STOCK_COUNT_SETTINGS: StockCountSettingsDTO = {
    stockCountDailyProducts: 5,
    stockCountRepeatDays: 30,
    stockCountNotifyEnabled: true,
};

export const STOCK_COUNT_LIMITS = {
    stockCountDailyProducts: { min: 1, max: 50 },
    stockCountRepeatDays: { min: 1, max: 365 },
} as const;

export const STOCK_COUNT_REASON_LABELS: Record<StockCountReason, string> = {
    damaged: "Roto o defectuoso",
    lost: "Perdido o robado",
    data_error: "Error de carga",
    found: "Apareció",
    other: "Otro",
};

// Motivos que tienen sentido según la diferencia
export const MISSING_REASONS: StockCountReason[] = ["damaged", "lost", "data_error", "other"];
export const SURPLUS_REASONS: StockCountReason[] = ["found", "data_error", "other"];

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Lo que debería haber en el local: el stock del sistema, menos lo que ya se fue sin descontarse
 * (ventas escaneadas pendientes, pedidos entregados sin lote asignado), más lo que se descontó
 * pero todavía está (pedidos con lote asignado sin entregar).
 */
export function computeExpectedStock(input: Omit<ExpectedStock, "expected">): ExpectedStock {
    const expected =
        input.totalStock - input.pendingSalesUnits - input.deliveredUnallocatedUnits + input.allocatedUndeliveredUnits;
    return { ...input, expected: Math.max(0, expected) };
}

export interface CountCandidate {
    productId: string;
    lastCountedAt: Date | null;
    unitsSold: number;
}

/**
 * Prioridad para contar: cuanto más tiempo sin contar (nunca = un año) y cuanto más se vende,
 * antes. Lo que más se mueve es donde más fácil se escapa una venta sin registrar.
 */
export function countPriority(candidate: CountCandidate, now: Date): number {
    const days = candidate.lastCountedAt ? Math.max(0, (now.getTime() - candidate.lastCountedAt.getTime()) / DAY_MS) : 365;
    const movement = 1 + Math.min(candidate.unitsSold, 20) / 10;
    return Math.min(days, 365) * movement;
}

/**
 * Lista de hoy: los de mayor prioridad que no se contaron en los últimos `repeatDays` días.
 * Orden estable (prioridad, después id) para que no cambie entre recargas.
 */
export function pickCountQueue<C extends CountCandidate>(
    candidates: C[],
    { limit, repeatDays, now }: { limit: number; repeatDays: number; now: Date },
): C[] {
    if (limit <= 0) return [];
    const cutoff = now.getTime() - repeatDays * DAY_MS;
    return candidates
        .filter((c) => !c.lastCountedAt || c.lastCountedAt.getTime() <= cutoff)
        .map((c) => ({ c, priority: countPriority(c, now) }))
        .sort((a, b) => b.priority - a.priority || a.c.productId.localeCompare(b.c.productId))
        .slice(0, limit)
        .map(({ c }) => c);
}

/** Por qué un producto está en la lista, para mostrarle a quien cuenta */
export function describeCountReasons(candidate: CountCandidate, now: Date): string[] {
    const why: string[] = [];
    if (!candidate.lastCountedAt) why.push("Nunca contado");
    else why.push(`Contado hace ${Math.floor((now.getTime() - candidate.lastCountedAt.getTime()) / DAY_MS)} días`);
    if (candidate.unitsSold > 0) {
        why.push(`${candidate.unitsSold} ${candidate.unitsSold === 1 ? "vendida" : "vendidas"} en 90 días`);
    }
    return why;
}

export interface CountLot {
    id: string;
    remainingQuantity: number;
    unitCost: number | null;
}

/**
 * Unidades a sacar de cada lote para dar de baja `quantity`, de la más vieja a la más nueva
 * (los lotes vienen ordenados por fecha). Puede quedar un resto si los lotes no alcanzan
 * (stock cargado sin compra); el costo es el de lo que sí salió de un lote con costo.
 */
export function takeFromLots(
    lots: CountLot[],
    quantity: number,
): { takes: { id: string; quantity: number }[]; cost: number | null; uncovered: number } {
    const takes: { id: string; quantity: number }[] = [];
    let remaining = quantity;
    let cost = 0;
    let costed = false;
    for (const lot of lots) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, Math.max(0, lot.remainingQuantity));
        if (take <= 0) continue;
        takes.push({ id: lot.id, quantity: take });
        if (lot.unitCost != null && lot.unitCost > 0) {
            cost += take * lot.unitCost;
            costed = true;
        }
        remaining -= take;
    }
    return { takes, cost: costed ? Math.round(cost * 100) / 100 : null, uncovered: remaining };
}

const COUNTS_URL = "https://mgrtechno.com.ar/admin/inventory/counts";
const MAX_DIFFERENCE_LINES = 10;

/** Mensaje del aviso diario; null si no hay nada que avisar. */
export function buildStockCountDigest({
    countedToday,
    dailyProducts,
    remainingToCount,
    differences,
}: {
    countedToday: number;
    dailyProducts: number;
    remainingToCount: number;
    differences: { productName: string; difference: number }[];
}): { title: string; description: string } | null {
    // Si ya no queda nada para contar (todo contado hace poco), no se reclama el día
    const missingToday = countedToday < dailyProducts && remainingToCount > 0;
    if (!missingToday && differences.length === 0) return null;

    const lines: string[] = [];
    if (missingToday) lines.push(`Hoy se contaron ${countedToday} de ${dailyProducts} productos.`);
    if (differences.length > 0) {
        if (lines.length) lines.push("");
        lines.push(`**${differences.length} ${differences.length === 1 ? "diferencia" : "diferencias"} sin resolver:**`);
        for (const d of differences.slice(0, MAX_DIFFERENCE_LINES)) {
            const qty = Math.abs(d.difference);
            lines.push(`• ${d.difference < 0 ? `Faltan ${qty}` : `Sobran ${qty}`} · ${d.productName}`);
        }
        if (differences.length > MAX_DIFFERENCE_LINES) lines.push(`… y ${differences.length - MAX_DIFFERENCE_LINES} más`);
    }
    lines.push("", `[Abrir el conteo](${COUNTS_URL})`);

    return {
        title: differences.length > 0 ? "🧮 Conteo de stock: diferencias para resolver" : "🧮 Conteo de stock pendiente",
        description: lines.join("\n"),
    };
}
