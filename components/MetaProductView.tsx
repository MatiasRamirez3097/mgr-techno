"use client";

import { useEffect } from "react";

interface MetaProductViewProps {
    productId: string;
    price: number;
}

export default function MetaProductView({
    productId,
    price,
}: MetaProductViewProps) {
    useEffect(() => {
        // Nos aseguramos de que el Pixel esté cargado en la ventana
        if (typeof window !== "undefined" && (window as any).fbq) {
            (window as any).fbq("track", "ViewContent", {
                content_ids: [productId],
                content_type: "product",
                currency: "ARS",
                value: price,
            });
            console.log(
                `✅ Meta Pixel: ViewContent enviado para ID ${productId}`,
            );
        }
    }, [productId, price]);

    // Este componente no muestra nada en pantalla, solo ejecuta el código por detrás
    return null;
}
