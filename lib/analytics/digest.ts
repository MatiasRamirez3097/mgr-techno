/**
 * Resumen diario de visitas para Discord (el de ayer, a la mañana). Función pura: arma el texto
 * a partir de los números; la lectura está en services/analytics/notifyAnalyticsDigest.ts.
 */

export type AnalyticsDigestInput = {
    date: string;
    visits: number;
    visitors: number;
    /** Promedio de visitas por día de los 7 días anteriores (null si no había datos) */
    previousAverage: number | null;
    topChannel: { label: string; visits: number } | null;
    topAdded: { name: string; adds: number }[];
    dailyDealsVisits: number;
    orders: number;
    searchesWithoutResults: string[];
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const num = (n: number) => n.toLocaleString("es-AR");

function dayLabel(date: string) {
    const weekday = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
    return `${weekday} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** null si no hubo visitas (no avisa). */
export function buildAnalyticsDigest(input: AnalyticsDigestInput): { title: string; description: string } | null {
    if (input.visits === 0) return null;

    const lines: string[] = [];

    let visitsLine = `**Visitas:** ${num(input.visits)} (${num(input.visitors)} visitantes)`;
    if (input.previousAverage) {
        const diff = Math.round(((input.visits - input.previousAverage) / input.previousAverage) * 100);
        const sign = diff > 0 ? "+" : "";
        visitsLine += ` · ${sign}${diff}% vs. promedio de 7 días (${num(Math.round(input.previousAverage))})`;
    }
    lines.push(visitsLine);

    if (input.topChannel) {
        const pct = Math.round((input.topChannel.visits / input.visits) * 100);
        lines.push(`**Origen principal:** ${input.topChannel.label} (${pct}%)`);
    }

    lines.push(`**Pedidos web:** ${num(input.orders)}`);
    lines.push(`**Ofertas del día:** ${num(input.dailyDealsVisits)} visitas a la sección`);

    if (input.topAdded.length) {
        lines.push("", "**Más agregados al carrito:**");
        input.topAdded.forEach((p, i) => lines.push(`${i + 1}. ${p.name} (${num(p.adds)})`));
    }

    if (input.searchesWithoutResults.length) {
        lines.push("", `**Buscaron y no encontraron:** ${input.searchesWithoutResults.join(", ")}`);
    }

    lines.push("", "Detalle en /admin/analytics");

    return { title: `📊 Visitas del ${dayLabel(input.date)}`, description: lines.join("\n") };
}
