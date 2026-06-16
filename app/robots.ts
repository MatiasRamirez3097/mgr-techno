import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            // 1. EL BOT ATACANTE Y CHUPASANGRE: Bloqueado absolutamente de todo
            {
                userAgent: [
                    "meta-webindexer",
                    "Bytespider",
                    "GPTBot",
                    "ClaudeBot",
                ],
                disallow: "/",
            },

            // 2. LOS BOTS ÚTILES DE META Y FACEBOOK: Bienvenidos a la tienda y al XML
            {
                userAgent: [
                    "meta-externalagent",
                    "Meta-ExternalFetcher",
                    "facebookexternalhit",
                    "Facebot",
                ],
                allow: [
                    "/",
                    "/api/shop-feed", // Vital para el catálogo de Instagram
                ],
                disallow: ["/admin/", "/mi-cuenta/", "/checkout/", "/*?*"],
            },

            // 3. EL RESTO DEL MUNDO (Googlebot, Bing, etc.)
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin/",
                    "/mi-cuenta/",
                    "/checkout/",
                    "/api/auth/",
                    "/api/admin/",
                    "/*?*",
                ],
            },
        ],
        // CORRECCIÓN APLICADA: Ruta exacta y directa a tu sitemap real
        sitemap: "https://mgrtechno.com.ar/sitemap.xml",
    };
}
