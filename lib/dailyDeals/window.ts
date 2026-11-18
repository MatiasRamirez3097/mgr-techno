/**
 * Horario de una tanda de ofertas: de 00:00 a 24:00 hora de Argentina (UTC−3, sin horario de
 * verano). `date` es YYYY-MM-DD.
 */
export function dealWindow(date: string): { startsAt: Date; endsAt: Date } {
    const startsAt = new Date(`${date}T00:00:00-03:00`);
    return { startsAt, endsAt: new Date(startsAt.getTime() + 24 * 60 * 60 * 1000) };
}
