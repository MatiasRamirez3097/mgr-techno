"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

export default function MetaPixel() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Dispara un PageView en las navegaciones subsecuentes (SPA)
        // Usamos un pequeño setTimeout para darle tiempo a Next.js de renderizar la página nueva
        const handleRouteChange = () => {
            if (typeof window !== "undefined" && (window as any).fbq) {
                setTimeout(() => {
                    (window as any).fbq("track", "PageView");
                }, 50);
            }
        };

        handleRouteChange();
    }, [pathname, searchParams]);

    return (
        <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
                __html: `
                    !function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window, document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    
                    fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL}'); 
                    
                    // ESTA ES LA LÍNEA MÁGICA: Forzamos el primer evento directamente al nacer
                    fbq('track', 'PageView');
                `,
            }}
        />
    );
}

export const trackPurchase = (cartItems: any[], orderTotal: number) => {
    // 1. Extraemos los IDs de los productos comprados (asegurándonos de usar _id o id)
    const contentIds = cartItems
        .map(
            (item) =>
                item.product?._id || item.product?.id || item._id || item.id,
        )
        .filter(Boolean); // Filtramos por las dudas si hay alguno undefined

    // 2. Si no hay IDs, cancelamos para no mandar basura a Meta
    if (contentIds.length === 0) {
        console.warn(
            "Meta Pixel: Intento de enviar Purchase sin productos válidos.",
        );
        return;
    }

    // 3. Enviamos el evento de Compra
    if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Purchase", {
            content_ids: contentIds,
            content_type: "product",
            value: orderTotal,
            currency: "ARS",
            num_items: cartItems.reduce(
                (acc, item) => acc + (item.quantity || 1),
                0,
            ), // Cantidad total de artículos
        });
        console.log(
            `✅ Meta Pixel: Purchase enviado con éxito. Total: $${orderTotal}. IDs:`,
            contentIds,
        );
    }
};
