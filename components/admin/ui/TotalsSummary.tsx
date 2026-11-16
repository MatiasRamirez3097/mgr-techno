"use client";

import { useState, type ReactNode } from "react";
import { StickyActionBar } from "./StickyActionBar";
import { cardClass } from "./styles";

export interface TotalsRow {
    label: ReactNode;
    value: ReactNode;
    // Texto en rojo/ámbar/verde para avisos (ej: "Restante")
    tone?: "default" | "muted" | "warning" | "danger" | "success";
}

interface TotalsProps {
    rows: TotalsRow[];
    totalLabel?: ReactNode;
    total: ReactNode;
}

const toneClass: Record<NonNullable<TotalsRow["tone"]>, string> = {
    default: "text-gray-300",
    muted: "text-gray-500",
    warning: "text-amber-300",
    danger: "text-red-400",
    success: "text-green-400",
};

/** Filas de importes (subtotal, IVA, envío…) seguidas del total destacado. */
export function TotalsList({ rows, totalLabel = "Total", total }: TotalsProps) {
    return (
        <dl className="flex flex-col gap-2 text-sm">
            {rows.map((row, i) => (
                <div key={i} className={`flex items-baseline justify-between gap-3 ${toneClass[row.tone ?? "default"]}`}>
                    <dt>{row.label}</dt>
                    <dd className="text-right font-mono">{row.value}</dd>
                </div>
            ))}
            <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-gray-700 pt-2 text-base font-bold">
                <dt className="text-white">{totalLabel}</dt>
                <dd className="text-right font-mono text-brand">{total}</dd>
            </div>
        </dl>
    );
}

/** Tarjeta de importes para la columna derecha (pegada) de los formularios en escritorio. */
export function TotalsCard({ title = "Resumen", children, ...props }: TotalsProps & { title?: ReactNode; children?: ReactNode }) {
    return (
        <section className={`${cardClass} p-4 sm:p-6`}>
            <h2 className="mb-4 text-base font-bold text-white">{title}</h2>
            <TotalsList {...props} />
            {children}
        </section>
    );
}

interface BarProps extends TotalsProps {
    // Botones de la barra (Guardar…)
    children: ReactNode;
    dirty?: boolean;
    // Mensaje (error / éxito) arriba del total
    message?: ReactNode;
    className?: string;
}

/**
 * Barra de acciones del celular con el total siempre visible: tocando el total se despliega el
 * detalle de importes arriba de la barra.
 */
export function TotalsActionBar({ rows, totalLabel = "Total", total, children, dirty, message, className = "" }: BarProps) {
    const [open, setOpen] = useState(false);

    return (
        <StickyActionBar
            className={className}
            dirty={dirty}
            info={
                <div className="flex flex-col gap-1">
                    {message}
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className="flex items-center gap-2 text-left"
                    >
                        <span className="text-gray-400">{totalLabel}</span>
                        <span className="font-mono text-base font-bold text-white">{total}</span>
                        <span aria-hidden className={`text-xs text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}>
                            ▲
                        </span>
                    </button>
                </div>
            }
            top={
                open && rows.length > 0 ? (
                    <div className="mb-3 border-b border-gray-800 pb-3">
                        <TotalsList rows={rows} totalLabel={totalLabel} total={total} />
                    </div>
                ) : null
            }
        >
            {children}
        </StickyActionBar>
    );
}
