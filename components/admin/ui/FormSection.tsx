"use client";

import { useState, type ReactNode } from "react";
import { cardClass } from "./styles";

interface Props {
    // Ancla para el índice de secciones (SectionNav)
    id?: string;
    title: ReactNode;
    description?: ReactNode;
    // Contenido a la derecha del título (ej: botón "Agregar")
    headerActions?: ReactNode;
    // Se puede plegar; `summary` se muestra mientras está plegada (ej: "12 atributos cargados")
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    summary?: ReactNode;
    // Resalta la sección cuando tiene errores de validación
    hasError?: boolean;
    className?: string;
    children: ReactNode;
}

/** Tarjeta de sección de un formulario del panel. */
export function FormSection({
    id,
    title,
    description,
    headerActions,
    collapsible = false,
    defaultCollapsed = false,
    summary,
    hasError = false,
    className = "",
    children,
}: Props) {
    const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
    const contentId = id ? `${id}-content` : undefined;

    const heading = (
        <span className="flex items-center gap-2">
            {collapsible && (
                <span aria-hidden className={`text-xs text-gray-500 transition-transform ${collapsed ? "" : "rotate-90"}`}>
                    ▶
                </span>
            )}
            <span>{title}</span>
            {hasError && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Tiene errores" />}
        </span>
    );

    return (
        <section
            id={id}
            // scroll-mt: que el índice o la barra superior del celular no tapen el título al saltar
            className={`${cardClass} scroll-mt-32 md:scroll-mt-24 p-4 sm:p-6 ${hasError ? "border-red-500/50" : ""} ${className}`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-white">
                        {collapsible ? (
                            <button
                                type="button"
                                onClick={() => setCollapsed((c) => !c)}
                                aria-expanded={!collapsed}
                                aria-controls={contentId}
                                className="text-left hover:text-gray-200"
                            >
                                {heading}
                            </button>
                        ) : (
                            heading
                        )}
                    </h2>
                    {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
                    {collapsed && summary && <p className="mt-1 text-xs text-gray-400">{summary}</p>}
                </div>
                {headerActions && !collapsed && <div className="flex flex-wrap gap-2">{headerActions}</div>}
            </div>
            <div id={contentId} hidden={collapsed} className="mt-4">
                {children}
            </div>
        </section>
    );
}
