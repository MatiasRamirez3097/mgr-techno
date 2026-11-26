/**
 * Cálculos puros del panel de visitas (/admin/analytics): rango de fechas, armado de la tabla
 * de productos y porcentajes. La lectura de la base está en services/analytics.
 */

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function parseAnalyticsRange(value: string | undefined): AnalyticsRange {
    const n = Number(value);
    return (ANALYTICS_RANGES as readonly number[]).includes(n) ? (n as AnalyticsRange) : 30;
}

/** Suma días a una fecha YYYY-MM-DD (sin zona horaria: es un día de calendario). */
export function addDays(date: string, days: number): string {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Los últimos `days` días hasta `today` incluido, del más viejo al más nuevo. */
export function lastDays(today: string, days: number): string[] {
    return Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));
}

/** Comienzo del día en Argentina (UTC−3, sin horario de verano). */
export function startOfStoreDay(date: string): Date {
    return new Date(`${date}T00:00:00-03:00`);
}

/** Porcentaje entero de a sobre b (null si b es 0). */
export function percentOf(part: number, total: number): number | null {
    if (!total) return null;
    return Math.round((part / total) * 100);
}

export type ProductCounts = { views: number; adds: number; units: number };

export type ProductRowInput = {
    id: string;
    name: string;
    slug: string | null;
} & ProductCounts;

export type ProductRow = ProductRowInput & {
    /** Agregados / vistas */
    addRate: number | null;
    /** Unidades vendidas / agregados */
    buyRate: number | null;
};

export type ProductSort = "views" | "adds" | "units";

/**
 * Une vistas, agregados y unidades vendidas por producto, calcula los porcentajes y ordena.
 * Los productos que ya no existen quedan con el nombre "Producto eliminado".
 */
export function buildProductRows(
    counts: Map<string, ProductCounts>,
    products: Map<string, { name: string; slug: string | null }>,
    sort: ProductSort,
    limit: number,
): ProductRow[] {
    const rows: ProductRow[] = [];
    for (const [id, c] of counts) {
        const product = products.get(id);
        rows.push({
            id,
            name: product?.name ?? "Producto eliminado",
            slug: product?.slug ?? null,
            ...c,
            addRate: percentOf(c.adds, c.views),
            buyRate: percentOf(c.units, c.adds),
        });
    }
    const secondary: ProductSort = sort === "views" ? "adds" : "views";
    rows.sort((a, b) => b[sort] - a[sort] || b[secondary] - a[secondary] || a.name.localeCompare(b.name));
    return rows.filter((r) => r[sort] > 0).slice(0, limit);
}

/** Suma un valor a un contador por producto (crea la entrada si no existe). */
export function addProductCount(
    counts: Map<string, ProductCounts>,
    id: string,
    field: keyof ProductCounts,
    value: number,
) {
    const entry = counts.get(id) ?? { views: 0, adds: 0, units: 0 };
    entry[field] += value;
    counts.set(id, entry);
}
