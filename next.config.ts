import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "mgrtechno.com.ar",
            },
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
            {
                protocol: "https",
                hostname: "www.afip.gob.ar",
            },
            {
                protocol: "https",
                hostname: "images.elit.com.ar",
            },
            {
                protocol: "https",
                hostname: "static.nb.com.ar",
            },
            {
                protocol: "https",
                hostname: "**.elit.com.ar",
            },
            {
                protocol: "https",
                hostname: "**.nb.com.ar",
            },
            {
                protocol: "https",
                hostname: "**.invidcomputer.com",
            },
            {
                protocol: "http",
                hostname: "**.invidcomputer.com",
            },
        ],
    },
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingIncludes: {
        "/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    },
    async redirects() {
        return [
            {
                source: "/cart",
                destination: "/",
                permanent: true,
            },
            {
                source: "/wp-content/uploads/woo-feed/custom2/xml/hardgamers.xml",
                destination: "/hardgamers.xml",
                permanent: true,
            },
            {
                // TraducciÃ³n exacta para componentesdepc (con paginaciÃ³n)
                source: "/product-category/componentesdepc/page/:page",
                destination: "/productos/categoria/componentes-de-pc",
                permanent: true,
            },
            {
                // TraducciÃ³n exacta para componentesdepc (sin paginaciÃ³n)
                source: "/product-category/componentesdepc",
                destination: "/productos/categoria/componentes-de-pc",
                permanent: true,
            },

            // ... A PARTIR DE ACÃ VAN LAS REGLAS GENERALES QUE ARMAMOS ANTES ...

            // --- CATEGORÃAS DE 3 NIVELES ---
            {
                source: "/product-category/:abuelo/:padre/:hijo/page/:page",
                destination: "/productos/categoria/:hijo",
                permanent: true,
            },
            // --- 1. CATEGORÃAS DE 3 NIVELES (Por si acaso) ---
            {
                source: "/product-category/:abuelo/:padre/:hijo/page/:page",
                destination: "/productos/categoria/:hijo",
                permanent: true,
            },
            {
                source: "/product-category/:abuelo/:padre/:hijo",
                destination: "/productos/categoria/:hijo",
                permanent: true,
            },

            // --- 2. CATEGORÃAS DE 2 NIVELES (El error que estÃ¡s viendo) ---
            {
                // Atrapa: /product-category/componentesdepc/gabinetes/page/2
                source: "/product-category/:padre/:hijo/page/:page",
                // Lo manda a: /productos/categoria/gabinetes
                destination: "/productos/categoria/:hijo",
                permanent: true,
            },
            {
                // Atrapa: /product-category/componentesdepc/gabinetes
                source: "/product-category/:padre/:hijo",
                destination: "/productos/categoria/:hijo",
                permanent: true,
            },

            // --- 3. CATEGORÃAS DE 1 NIVEL ---
            {
                source: "/product-category/:slug/page/:page",
                destination: "/productos/categoria/:slug",
                permanent: true,
            },
            {
                source: "/product-category/:slug",
                destination: "/productos/categoria/:slug",
                permanent: true,
            },
            {
                source: "/product/:slug",
                destination: "/productos/:slug",
                permanent: true,
            },

            // --- 4. TIENDA GENERAL VIEJA ---
            {
                // Atrapa /shop, /shop/page/2, /shop/lo-que-sea
                // Al no poner variables en el destino, destruye la ruta vieja y manda al inicio del catÃ¡logo
                source: "/shop/:path*",
                destination: "/productos",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
