"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

/** Registra una búsqueda de la tienda con la cantidad de resultados (una vez por término y visita). */
export function SearchTracker({ query, results }: { query: string; results: number }) {
    useEffect(() => {
        track("search", { query, results });
    }, [query, results]);

    return null;
}
