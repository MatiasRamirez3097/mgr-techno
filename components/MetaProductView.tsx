"use client";

import { useEffect } from "react";

interface MetaProductViewProps {
    productId: string;
    price: number; // A veces Next.js/React lo recibe como string desde la base de datos
}

export default function MetaProductView({
    productId,
    price,
}: MetaProductViewProps) {
    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).fbq) {
            // 🔥 LA CLAVE ESTÁ AQUÍ: Forzamos que sea un número
            const cleanPrice = Number(price);

            (window as any).fbq("track", "ViewContent", {
                content_ids: [productId],
                content_type: "product",
                currency: "ARS",
                value: cleanPrice, // Mandamos la variable limpia
            });

            console.log(
                `✅ Meta Pixel: ViewContent enviado para ID ${productId} (Valor numérico: ${cleanPrice})`,
            );
        }
    }, [productId, price]);

    return null;
}
