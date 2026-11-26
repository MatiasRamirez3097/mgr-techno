"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/analytics/track";

/** Registra una vista de página en cada cambio de ruta o de búsqueda de la tienda. */
export function PageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const query = searchParams.toString();
    // Evita el doble disparo del modo estricto de React en desarrollo
    const lastTracked = useRef<string | null>(null);

    useEffect(() => {
        const url = `${pathname}?${query}`;
        if (lastTracked.current === url) return;
        lastTracked.current = url;
        track("page_view");
    }, [pathname, query]);

    return null;
}
