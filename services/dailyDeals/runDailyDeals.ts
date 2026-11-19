import { createTodayDeal, type CreateTodayDealResult } from "./createTodayDeal";
import { finishPastDeals } from "./finishPastDeals";

/**
 * Ciclo diario: termina las tandas de días anteriores y, si está activado, genera la de hoy.
 * Lo llama el cron de las 00:00 y, como respaldo, el cron horario (si ya está hecho no hace nada).
 */
export async function runDailyDeals(
    now = new Date(),
): Promise<{ finished: { deals: number; restored: number }; today: CreateTodayDealResult }> {
    const finished = await finishPastDeals(now);
    const today = await createTodayDeal(now);
    return { finished, today };
}
