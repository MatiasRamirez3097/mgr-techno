import type { ReactNode } from "react";

export type BarListRow = {
    key: string;
    label: ReactNode;
    value: number;
    // Texto chico debajo (ej: los orígenes de un canal)
    hint?: ReactNode;
};

const pct = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);

/**
 * Lista con barra horizontal: etiqueta, cantidad y porcentaje sobre `total`. Una sola serie,
 * así que todas las barras van en el color de la marca.
 */
export function BarList({
    rows,
    total,
    empty = "Sin datos en el período.",
}: {
    rows: BarListRow[];
    total: number;
    empty?: ReactNode;
}) {
    if (!rows.length) return <p className="text-sm text-gray-500">{empty}</p>;

    return (
        <ul className="flex flex-col gap-3">
            {rows.map((row) => {
                const p = pct(row.value, total);
                return (
                    <li key={row.key}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate text-gray-200">{row.label}</span>
                            <span className="shrink-0 tabular-nums text-gray-300">
                                {row.value.toLocaleString("es-AR")}
                                <span className="ml-2 inline-block w-10 text-right text-xs text-gray-500">{p}%</span>
                            </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-gray-800">
                            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${Math.max(p, row.value ? 1 : 0)}%` }} />
                        </div>
                        {row.hint && <p className="mt-1 text-xs text-gray-500">{row.hint}</p>}
                    </li>
                );
            })}
        </ul>
    );
}
