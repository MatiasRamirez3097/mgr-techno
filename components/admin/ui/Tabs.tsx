"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

export interface TabItem {
    id: string;
    label: ReactNode;
    // Contador o aviso al lado de la etiqueta (ej: "2", "Pendiente")
    badge?: ReactNode;
    // Resalta el badge (algo para hacer en esa pestaña)
    attention?: boolean;
    hidden?: boolean;
    content: ReactNode;
}

interface Props {
    tabs: TabItem[];
    ariaLabel?: string;
}

const subscribeHash = (cb: () => void) => {
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
};

/**
 * Pestañas para páginas de detalle largas. Todas las pestañas se renderizan (las ocultas con
 * `hidden`), así los componentes de cliente no pierden su estado al cambiar. La pestaña elegida
 * queda en el `#` de la URL: al recargar o volver se abre la misma.
 */
export function Tabs({ tabs, ariaLabel = "Secciones" }: Props) {
    const visible = tabs.filter((t) => !t.hidden);
    const hash = useSyncExternalStore(
        subscribeHash,
        () => window.location.hash.slice(1),
        () => "",
    );
    const [picked, setPicked] = useState<string | null>(null);

    const fromHash = visible.some((t) => t.id === hash) ? hash : null;
    const active = picked && visible.some((t) => t.id === picked) ? picked : (fromHash ?? visible[0]?.id);

    const select = (id: string) => {
        setPicked(id);
        window.history.replaceState(null, "", `#${id}`);
    };

    return (
        <div className="flex flex-col gap-4">
            <div
                role="tablist"
                aria-label={ariaLabel}
                // Pegada debajo de la barra superior del celular (h-16); en md+ no hay barra
                className="sticky top-16 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-gray-800 bg-gray-950/95 px-4 backdrop-blur [scrollbar-width:none] sm:-mx-6 sm:px-6 md:top-0 md:mx-0 md:px-0"
            >
                {visible.map((tab) => {
                    const isActive = tab.id === active;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            id={`tab-${tab.id}`}
                            aria-selected={isActive}
                            aria-controls={`panel-${tab.id}`}
                            onClick={() => select(tab.id)}
                            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm whitespace-nowrap transition ${
                                isActive
                                    ? "border-brand font-semibold text-white"
                                    : "border-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            {tab.label}
                            {tab.badge !== undefined && tab.badge !== null && (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                        tab.attention ? "bg-amber-400/15 text-amber-300" : "bg-gray-800 text-gray-300"
                                    }`}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {visible.map((tab) => (
                <div
                    key={tab.id}
                    role="tabpanel"
                    id={`panel-${tab.id}`}
                    aria-labelledby={`tab-${tab.id}`}
                    hidden={tab.id !== active}
                >
                    {tab.content}
                </div>
            ))}
        </div>
    );
}
