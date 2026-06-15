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
                // La tienda general de WooCommerce
                source: "/shop",
                destination: "/productos",
                permanent: true, // Código 301
            },
            {
                // Atrapa cualquier categoría de WooCommerce y la manda a tu nueva estructura
                // Ej: /product-category/gabinetes -> /productos/categoria/gabinetes
                source: "/product-category/:slug*",
                destination: "/productos/categoria/:slug*",
                permanent: true,
            },
            {
                // Si tenías etiquetas de WooCommerce
                source: "/product-tag/:slug*",
                destination: "/productos", // Mandalas al catálogo general
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
