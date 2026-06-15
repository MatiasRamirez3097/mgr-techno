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
        ],
    },
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingIncludes: {
        "/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    },
    async redirects() {
        return [
            {
                // Atrapa /shop, /shop/page/3, /shop/cualquier-cosa
                // Al no poner :path* en el destino, borra la basura vieja
                source: "/shop/:path*",
                destination: "/productos",
                permanent: true, // Código 301
            },
            {
                // MUY IMPORTANTE: Atrapa la paginación vieja de las categorías
                // Ej: /product-category/gabinetes/page/3 -> /productos/categoria/gabinetes
                source: "/product-category/:slug/page/:page",
                destination: "/productos/categoria/:slug",
                permanent: true,
            },
            {
                // Atrapa la categoría normal (sin paginación)
                // Ej: /product-category/gabinetes -> /productos/categoria/gabinetes
                source: "/product-category/:slug",
                destination: "/productos/categoria/:slug",
                permanent: true,
            },
            {
                // Atrapa etiquetas viejas de WooCommerce
                source: "/product-tag/:slug*",
                destination: "/productos",
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
