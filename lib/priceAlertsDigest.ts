// Variación de costo a partir de la cual un cambio entra en el aviso diario
export const DIGEST_COST_CHANGE_THRESHOLD = 0.05;
// Discord admite hasta 4096 caracteres en la descripción de un embed
const DISCORD_DESCRIPTION_LIMIT = 4096;
const MAX_LINES_PER_SECTION = 10;

export interface DigestBelowMinRow {
    productId: string;
    name: string;
    effectivePrice: number;
    bestCost: number | null;
    margin: number | null;
    minMarginPercent: number;
}

export interface DigestCostChange {
    productName: string;
    distributor: string;
    change: number;
}

const formatArs = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const formatPercent = (n: number) =>
    `${n > 0 ? "+" : ""}${(n * 100).toLocaleString("es-AR", { maximumFractionDigits: 1 })}%`;

/** Productos bajo el mínimo que no estaban en el aviso anterior. */
export function selectNewlyBelowMin<T extends { productId: string }>(rows: T[], previouslyAlerted: string[]): T[] {
    const previous = new Set(previouslyAlerted);
    return rows.filter((r) => !previous.has(r.productId));
}

/** Cambios de costo que superan el umbral, de mayor a menor variación absoluta. */
export function selectSignificantChanges<T extends { change: number }>(
    changes: T[],
    threshold = DIGEST_COST_CHANGE_THRESHOLD,
): T[] {
    return changes.filter((c) => Math.abs(c.change) >= threshold).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

/**
 * Arma el aviso para Discord. Devuelve null si no hay nada nuevo que avisar (para no repetir
 * todos los días los mismos productos).
 */
export function buildPriceAlertDigest(input: {
    newlyBelowMin: DigestBelowMinRow[];
    totalBelowMin: number;
    costChanges: DigestCostChange[];
    reviewUrl: string;
}): { title: string; description: string } | null {
    const { newlyBelowMin, totalBelowMin, costChanges, reviewUrl } = input;
    if (newlyBelowMin.length === 0 && costChanges.length === 0) return null;

    const sections: string[] = [];

    if (newlyBelowMin.length > 0) {
        const lines = newlyBelowMin.slice(0, MAX_LINES_PER_SECTION).map((r) => {
            const margin = r.margin === null ? "—" : formatPercent(r.margin);
            const cost = r.bestCost === null ? "—" : formatArs(r.bestCost);
            return `• ${r.name}: ${formatArs(r.effectivePrice)} vs costo ${cost} (margen ${margin}, mín. ${r.minMarginPercent}%)`;
        });
        const more = newlyBelowMin.length - lines.length;
        sections.push(
            `**${newlyBelowMin.length} producto(s) nuevos bajo el margen mínimo** (${totalBelowMin} en total)\n` +
                lines.join("\n") +
                (more > 0 ? `\n… y ${more} más` : ""),
        );
    }

    if (costChanges.length > 0) {
        const lines = costChanges
            .slice(0, MAX_LINES_PER_SECTION)
            .map((c) => `• ${c.productName} (${c.distributor}): ${formatPercent(c.change)}`);
        const more = costChanges.length - lines.length;
        sections.push(
            `**${costChanges.length} costo(s) con variación de ${Math.round(DIGEST_COST_CHANGE_THRESHOLD * 100)}% o más**\n` +
                lines.join("\n") +
                (more > 0 ? `\n… y ${more} más` : ""),
        );
    }

    const footer = `\n\n[Abrir la revisión de precios](${reviewUrl})`;
    let description = sections.join("\n\n");
    if (description.length + footer.length > DISCORD_DESCRIPTION_LIMIT) {
        description = `${description.slice(0, DISCORD_DESCRIPTION_LIMIT - footer.length - 2)}…`;
    }

    return { title: "Revisión de precios", description: description + footer };
}
