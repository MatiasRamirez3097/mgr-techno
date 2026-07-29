"use client";

import { useEffect, useRef } from "react";

interface MetaPurchaseTrackerProps {
    orderId: string;
    items: any[];
    total: number;
}

export default function MetaPurchaseTracker({
    orderId,
    items,
    total,
}: MetaPurchaseTrackerProps) {
    // Usamos useRef para asegurarnos de que el useEffect no se ejecute dos veces
    // por el StrictMode de React 18
    const hasTracked = useRef(false);

    useEffect(() => {
        // 1. Verificamos si esta orden ya fue reportada a Meta guardándola en el navegador
        const storageKey = `meta_tracked_order_${orderId}`;
        const alreadyTracked = sessionStorage.getItem(storageKey);

        if (alreadyTracked || hasTracked.current) {
            return; // Si ya se reportó o el usuario hizo F5, cancelamos silenciosamente
        }

        // 2. Extraemos los IDs de los productos
        const contentIds = items
            .map(
                (item) =>
                    item.product?._id ||
                    item.product?.id ||
                    item._id ||
                    item.id,
            )
            .filter(Boolean);

        // 3. Disparamos el Pixel
        if (
            typeof window !== "undefined" &&
            (window as any).fbq &&
            contentIds.length > 0
        ) {
            (window as any).fbq("track", "Purchase", {
                content_ids: contentIds,
                content_type: "product",
                value: total,
                currency: "ARS",
                num_items: items.reduce(
                    (acc, item) => acc + (item.quantity || 1),
                    0,
                ),
            });

            console.log(
                `✅ Meta Pixel: Compra registrada para orden ${orderId}`,
            );

            // 4. Dejamos una marca para que no se vuelva a disparar si recarga la página
            sessionStorage.setItem(storageKey, "true");
            hasTracked.current = true;
        }
    }, [orderId, items, total]);

    return null; // Totalmente invisible
}
