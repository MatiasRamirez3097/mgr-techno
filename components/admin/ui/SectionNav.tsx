"use client";

import { useEffect, useState } from "react";

export interface SectionNavItem {
    id: string;
    label: string;
    hasError?: boolean;
    // Se omite del índice (ej: "Componentes del combo" en un producto simple)
    hidden?: boolean;
}

interface Props {
    sections: SectionNavItem[];
    // horizontal: chips desplazables pegados arriba (celular / pantallas medianas);
    // vertical: lista pegada al costado (escritorio ancho)
    orientation?: "horizontal" | "vertical";
    className?: string;
}

/**
 * Índice de secciones de un formulario largo: lleva a cada sección, marca la que está a la vista
 * y las que tienen errores. Las secciones se identifican por su `id` (FormSection lo recibe).
 */
export function SectionNav({ sections, orientation = "horizontal", className = "" }: Props) {
    const visible = sections.filter((s) => !s.hidden);
    const [active, setActive] = useState(visible[0]?.id ?? "");
    const ids = visible.map((s) => s.id).join(",");

    useEffect(() => {
        const elements = ids
            .split(",")
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => Boolean(el));
        if (elements.length === 0) return;

        // La sección activa es la primera que cruza la franja superior de la pantalla
        const observer = new IntersectionObserver(
            (entries) => {
                const onScreen = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (onScreen[0]) setActive(onScreen[0].target.id);
            },
            { rootMargin: "-120px 0px -55% 0px" },
        );
        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [ids]);

    const go = (id: string) => {
        setActive(id);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const horizontal = orientation === "horizontal";

    return (
        <nav
            aria-label="Secciones del formulario"
            className={
                horizontal
                    ? // Debajo de la barra superior del celular (h-16); en md+ no hay barra superior
                      `sticky top-16 z-20 -mx-4 border-b border-gray-800 bg-gray-950/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:top-0 md:mx-0 md:rounded-xl md:border md:px-2 ${className}`
                    : `sticky top-6 ${className}`
            }
        >
            <ul
                className={
                    horizontal
                        ? "flex gap-2 overflow-x-auto [scrollbar-width:none]"
                        : "flex flex-col gap-1"
                }
            >
                {visible.map((section) => {
                    const isActive = section.id === active;
                    return (
                        <li key={section.id} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => go(section.id)}
                                aria-current={isActive ? "location" : undefined}
                                className={`flex w-full items-center gap-2 whitespace-nowrap text-sm transition ${
                                    horizontal ? "rounded-full px-3 py-1.5" : "rounded-lg px-3 py-2 text-left"
                                } ${
                                    isActive
                                        ? `bg-brand/15 font-semibold text-white ${horizontal ? "" : "border-l-2 border-brand rounded-l-none"}`
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                            >
                                <span>{section.label}</span>
                                {section.hasError && (
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Tiene errores" />
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
