import { BusinessError } from "@/lib/errors/BusinessError";

const STORE_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** Fecha de hoy en Argentina como YYYY-MM-DD (no la de UTC). */
export function todayInStoreTimeZone(now: Date = new Date()): string {
    // en-CA formatea como YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: STORE_TIME_ZONE,
    }).format(now);
}

/**
 * Fecha de un pedido manual (YYYY-MM-DD) → valor para `createdAt`.
 * - Sin fecha o con la de hoy: undefined (Mongoose usa la hora actual).
 * - Fecha pasada: mediodía de ese día en Argentina, para que no cambie de
 *   día al verla en otra zona horaria.
 * - Fecha futura o inválida: BusinessError.
 */
export function parseOrderDate(
    date: string | undefined,
    now: Date = new Date(),
): Date | undefined {
    if (!date) return undefined;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BusinessError("Fecha del pedido inválida", 400);
    }

    const parsed = new Date(`${date}T12:00:00-03:00`);
    // Descarta fechas inexistentes (ej. 2026-02-30)
    if (
        Number.isNaN(parsed.getTime()) ||
        todayInStoreTimeZone(parsed) !== date
    ) {
        throw new BusinessError("Fecha del pedido inválida", 400);
    }

    const today = todayInStoreTimeZone(now);
    if (date > today) {
        throw new BusinessError("La fecha del pedido no puede ser futura", 400);
    }

    return date === today ? undefined : parsed;
}
