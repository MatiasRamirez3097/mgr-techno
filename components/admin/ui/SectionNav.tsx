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
    className?: string;
}

/**
 * Índice de secciones de un formulario largo. En escritorio, lista vertical pegada al costado;
 * en el celular, barra horizontal desplazable pegada debajo de la barra superior. Marca la
 * sección visible y las que tienen errores.
 */
export function SectionNav({ sections, className = "" }: Props) {
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

    return (
        <nav
            aria-label="Secciones del formulario"
            className={`sticky top-16 z-20 -mx-4 border-b border-gray-800 bg-gray-950/95 px-4 py-2 backdrop-blur md:top-6 md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none ${className}`}
        >
            <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible [scrollbar-width:none]">
                {visible.map((section) => {
                    const isActive = section.id === active;
                    return (
                        <li key={section.id} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => go(section.id)}
                                aria-current={isActive ? "location" : undefined}
                                className={`flex w-full items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition md:rounded-lg md:px-3 md:py-2 md:text-left ${
                                    isActive
                                        ? "bg-brand/15 text-white font-semibold md:border-l-2 md:border-brand md:rounded-l-none"
                                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                                }`}
                            >
                                <span>{section.label}</span>
                                {section.hasError && (
                                    <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Tiene errores" />
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
