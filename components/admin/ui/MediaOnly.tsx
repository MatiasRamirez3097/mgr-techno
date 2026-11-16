"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const DESKTOP_QUERY = "(min-width: 768px)"; // breakpoint md de Tailwind

function subscribe(callback: () => void) {
    const media = window.matchMedia(DESKTOP_QUERY);
    media.addEventListener("change", callback);
    return () => media.removeEventListener("change", callback);
}

const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

/**
 * Monta sus hijos sólo en escritorio (`desktop`) o sólo en el celular (`mobile`). A diferencia de
 * ocultar con CSS, evita montar dos veces componentes con estado o que piden datos (ej: la
 * edición rápida dentro de un listado que tiene versión tabla y versión tarjetas).
 */
export function MediaOnly({ on, children }: { on: "desktop" | "mobile"; children: ReactNode }) {
    // En el servidor no se sabe el ancho: no se monta hasta hidratar
    const desktop = useSyncExternalStore(subscribe, isDesktop, () => null);
    if (desktop === null) return null;
    return (on === "desktop") === desktop ? <>{children}</> : null;
}
