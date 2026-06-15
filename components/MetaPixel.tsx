"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useState } from "react";

export default function MetaPixel() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!isLoaded) return;

        // Cada vez que la ruta o los parámetros cambien, disparamos un nuevo PageView
        if (typeof window !== "undefined" && (window as any).fbq) {
            (window as any).fbq("track", "PageView");
        }
    }, [pathname, searchParams, isLoaded]);

    return (
        <Script
            id="meta-pixel"
            strategy="afterInteractive" // Espera a que la página cargue para no bloquear tu sitio
            onLoad={() => setIsLoaded(true)}
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
                    
                    // REEMPLAZA ESTO CON TU ID REAL DE META PIXEL
                    fbq('init', process.env.META_PIXEL); 
                `,
            }}
        />
    );
}
