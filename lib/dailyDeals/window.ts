/**
 * Horario de una tanda de ofertas: de 00:00 a 24:00 hora de Argentina (UTC−3, sin horario de
 * verano). `date` es YYYY-MM-DD.
 */
export function dealWindow(date: string): { startsAt: Date; endsAt: Date } {
    const startsAt = new Date(`${date}T00:00:00-03:00`);
    return { startsAt, endsAt: new Date(startsAt.getTime() + 24 * 60 * 60 * 1000) };
}

/** Suma días a una fecha YYYY-MM-DD */
export function addDays(date: string, days: number): string {
    return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Las ofertas ya empezaron: sin fecha de inicio programada, o con una que ya llegó */
export function hasDealsStarted(startDate: string | null, today: string): boolean {
    return !startDate || startDate <= today;
}
