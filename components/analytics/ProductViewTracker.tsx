"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

/** Registra la vista de la ficha de un producto (una vez por visita). */
export function ProductViewTracker({ productId }: { productId: string }) {
    useEffect(() => {
        track("product_view", { productId });
    }, [productId]);

    return null;
}
