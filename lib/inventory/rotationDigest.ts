import { ROTATION_REASON_LABELS } from "@/lib/inventory/rotation";
import type { RotationReason, RotationReport } from "@/types/shared/stockRotation";

const REPORT_URL = "https://mgrtechno.com.ar/admin/inventory/rotation";
const TOP_PRODUCTS = 5;
// Orden de los motivos en el resumen ("reponer" va aparte, al final)
const REASONS: RotationReason[] = ["slow", "old", "cheaper_replacement", "competitor_cheaper", "no_supplier"];

const money = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

/**
 * Resumen semanal de "Stock a rotar" para Discord: cantidad por motivo, costo parado y los
 * productos que más plata tienen inmovilizada. null si no hay nada que avisar.
 */
export function buildRotationDigest(report: RotationReport): { title: string; description: string } | null {
    const { summary } = report;
    const restock = summary.byReason.restock;
    if (summary.toRotate === 0 && restock === 0) return null;

    const lines: string[] = [];
    if (summary.toRotate > 0) {
        lines.push(`Costo parado: **${money(summary.stockCost)}**`, "");
        for (const reason of REASONS) {
            const count = summary.byReason[reason];
            if (count > 0) lines.push(`• ${ROTATION_REASON_LABELS[reason]}: ${count}`);
        }

        // Las filas ya vienen ordenadas por costo parado
        const top = report.rows
            .filter((r) => r.stockCost > 0 && r.reasons.some((x) => x !== "restock"))
            .slice(0, TOP_PRODUCTS);
        if (top.length > 0) {
            lines.push("", "**Más plata parada:**");
            for (const row of top) {
                const age = row.oldestAgeDays !== null ? `, ${row.oldestAgeDays} días` : "";
                lines.push(`• ${row.name} — ${row.availableStock} u., ${money(row.stockCost)}${age}`);
            }
        }
    }
    if (restock > 0) {
        if (lines.length > 0) lines.push("");
        lines.push(`🔁 Para reponer: ${restock}`);
    }
    lines.push("", `[Ver Stock a rotar](${REPORT_URL})`);

    const title =
        summary.toRotate > 0
            ? `🐢 ${summary.toRotate} ${summary.toRotate === 1 ? "producto" : "productos"} para rotar`
            : `🔁 ${restock} ${restock === 1 ? "producto" : "productos"} para reponer`;
    return { title, description: lines.join("\n") };
}
