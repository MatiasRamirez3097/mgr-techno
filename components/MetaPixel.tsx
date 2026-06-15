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
