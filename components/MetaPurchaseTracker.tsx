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
    const hasTracked = useRef(false);

    useEffect(() => {
        // 1. Verificamos si esta orden ya fue reportada
        const storageKey = `meta_tracked_order_${orderId}`;
        const alreadyTracked = sessionStorage.getItem(storageKey);

        if (alreadyTracked || hasTracked.current) {
            return;
        }

        // 2. Extraemos los IDs de los productos
        const contentIds = items
            .map(
                (item) =>
                    item.product?._id ||
                    item.product?.id ||
                    item._id ||
                    item.id ||
                    item.productId,
            )
            .filter(Boolean);

        // Validamos si logramos extraer IDs. Si no extrae nada, te avisará en consola.
        if (contentIds.length === 0) {
            console.warn(
                "⚠️ Meta Pixel: No se encontraron IDs en los productos. Revisa la estructura de 'items':",
                items,
            );
            return;
        }

        // 3. Sistema de reintentos por si el script de Meta tarda en cargar
        let retries = 0;
        const maxRetries = 10; // Intentará por un máximo de 5 segundos (10 * 500ms)

        const tryTrackPixel = () => {
            if (typeof window !== "undefined" && (window as any).fbq) {
                // Disparamos el Pixel
                (window as any).fbq("track", "Purchase", {
                    content_ids: contentIds,
                    content_type: "product",
                    value: total,
                    currency: "ARS", // Asegúrate de que esta sea la moneda correcta de tu pixel
                    num_items: items.reduce(
                        (acc, item) => acc + (item.quantity || 1),
                        0,
                    ),
                });

                console.log(
                    `✅ Meta Pixel: Compra registrada para orden ${orderId}`,
                );

                // 4. Marcamos como rastreado
                sessionStorage.setItem(storageKey, "true");
                hasTracked.current = true;
            } else if (retries < maxRetries) {
                retries++;
                console.log(
                    `⏳ Meta Pixel no detectado aún. Reintentando... (${retries}/${maxRetries})`,
                );
                setTimeout(tryTrackPixel, 500); // Vuelve a intentar en medio segundo
            } else {
                console.error(
                    "❌ Meta Pixel: Nunca terminó de cargar 'window.fbq'. Verifica la instalación de tu Píxel en el layout.",
                );
            }
        };

        tryTrackPixel();
    }, [orderId, items, total]);

    return null;
}
