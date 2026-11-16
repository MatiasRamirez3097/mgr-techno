"use client";

import { useState, type ReactNode } from "react";
import { buttonClass } from "./styles";

interface Props {
    // Cantidad de filtros aplicados, para el botón del celular
    activeCount?: number;
    children: ReactNode;
    className?: string;
}

/**
 * Filtros de un listado: en escritorio se muestran en línea; en el celular quedan detrás de un
 * botón "Filtros (n)" para no ocupar media pantalla antes de los resultados.
 */
export function FiltersDrawer({ activeCount = 0, children, className = "" }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <div className={className}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className={`${buttonClass.secondary} w-full md:hidden`}
            >
                Filtros{activeCount > 0 ? ` (${activeCount})` : ""} {open ? "▴" : "▾"}
            </button>
            <div
                className={`${open ? "mt-3 flex" : "hidden"} flex-col gap-3 md:mt-0 md:flex md:flex-row md:flex-wrap md:items-center max-md:[&_select]:w-full max-md:[&_input]:w-full`}
            >
                {children}
            </div>
        </div>
    );
}
