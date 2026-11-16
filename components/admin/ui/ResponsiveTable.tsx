import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { cardClass } from "./styles";

/**
 * Lugar de una columna en la tarjeta del celular:
 * - media: imagen a la izquierda
 * - title / subtitle: encabezado de la tarjeta
 * - badge: chips debajo del título (estado, etc.)
 * - field: dato con su etiqueta, en grilla de 2 columnas
 * - actions: botones al pie
 * - hidden: sólo en la tabla de escritorio
 */
export type MobileSlot = "media" | "title" | "subtitle" | "badge" | "field" | "actions" | "hidden";

export interface Column<T> {
    key: string;
    header: ReactNode;
    cell: (row: T) => ReactNode;
    mobile?: MobileSlot;
    // Etiqueta en la tarjeta (por defecto, el encabezado)
    mobileLabel?: ReactNode;
    align?: "left" | "right" | "center";
    className?: string;
    headerClassName?: string;
}

interface Props<T> {
    rows: T[];
    columns: Column<T>[];
    getRowKey: (row: T) => string;
    // Toda la tarjeta del celular lleva a este link (las acciones siguen funcionando aparte)
    rowHref?: (row: T) => string | null;
    // Fila extra debajo (ej: edición rápida desplegada); en el celular va al pie de la tarjeta
    renderExpanded?: (row: T) => ReactNode;
    empty?: ReactNode;
    // Ancho mínimo de la tabla de escritorio (scroll horizontal si no entra)
    minWidth?: string;
    className?: string;
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Listado con una sola definición de columnas: tabla desde md y tarjetas en el celular.
 * Sirve tanto en componentes de servidor como de cliente (no usa estado).
 */
export function ResponsiveTable<T>({
    rows,
    columns,
    getRowKey,
    rowHref,
    renderExpanded,
    empty = "No hay resultados.",
    minWidth = "720px",
    className = "",
}: Props<T>) {
    if (rows.length === 0) {
        return <div className={`${cardClass} p-10 text-center text-sm text-gray-500 ${className}`}>{empty}</div>;
    }

    const slot = (c: Column<T>) => c.mobile ?? "field";
    const bySlot = (s: MobileSlot) => columns.filter((c) => slot(c) === s);

    return (
        <div className={className}>
            {/* Celular: tarjetas */}
            <ul className="flex flex-col gap-3 md:hidden">
                {rows.map((row) => {
                    const key = getRowKey(row);
                    const href = rowHref?.(row) ?? null;
                    const expanded = renderExpanded?.(row);
                    const header = (
                        <div className="flex gap-3">
                            {bySlot("media").map((c) => (
                                <div key={c.key} className="shrink-0">
                                    {c.cell(row)}
                                </div>
                            ))}
                            <div className="min-w-0 flex-1">
                                {bySlot("title").map((c) => (
                                    <div key={c.key} className="text-sm font-semibold text-white break-words">
                                        {c.cell(row)}
                                    </div>
                                ))}
                                {bySlot("subtitle").map((c) => (
                                    <div key={c.key} className="text-xs text-gray-400 break-words">
                                        {c.cell(row)}
                                    </div>
                                ))}
                                {bySlot("badge").length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {bySlot("badge").map((c) => (
                                            <Fragment key={c.key}>{c.cell(row)}</Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                    return (
                        <li key={key} className={`${cardClass} p-4`}>
                            {href ? (
                                <Link href={href} className="block">
                                    {header}
                                </Link>
                            ) : (
                                header
                            )}
                            {bySlot("field").length > 0 && (
                                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    {bySlot("field").map((c) => (
                                        <div key={c.key} className="min-w-0">
                                            <dt className="text-[11px] uppercase tracking-wide text-gray-500">
                                                {c.mobileLabel ?? c.header}
                                            </dt>
                                            <dd className="text-gray-200 break-words">{c.cell(row)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                            {bySlot("actions").length > 0 && (
                                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-800 pt-3">
                                    {bySlot("actions").map((c) => (
                                        <Fragment key={c.key}>{c.cell(row)}</Fragment>
                                    ))}
                                </div>
                            )}
                            {expanded && <div className="mt-3">{expanded}</div>}
                        </li>
                    );
                })}
            </ul>

            {/* Escritorio: tabla */}
            <div className={`${cardClass} hidden overflow-x-auto md:block`}>
                <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
                    <thead className="border-b border-gray-800 bg-gray-800/50 text-gray-400">
                        <tr>
                            {columns.map((c) => (
                                <th
                                    key={c.key}
                                    className={`px-4 py-3 font-semibold ${ALIGN[c.align ?? "left"]} ${c.headerClassName ?? ""}`}
                                >
                                    {c.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {rows.map((row) => {
                            const expanded = renderExpanded?.(row);
                            return (
                                <Fragment key={getRowKey(row)}>
                                    <tr className="align-middle hover:bg-gray-800/30">
                                        {columns.map((c) => (
                                            <td
                                                key={c.key}
                                                className={`px-4 py-3 ${ALIGN[c.align ?? "left"]} ${c.className ?? ""}`}
                                            >
                                                {c.cell(row)}
                                            </td>
                                        ))}
                                    </tr>
                                    {expanded && (
                                        <tr className="bg-gray-800/30">
                                            <td colSpan={columns.length} className="px-4 py-4">
                                                {expanded}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
