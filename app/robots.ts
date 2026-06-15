import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin/",
                    "/mi-cuenta/",
                    "/checkout/",
                    "/api/",
                    "/*?*", // Frena en seco el rastreo de URLs con parámetros
                ],
            },
        ],
        sitemap: "https://www.mgrtechno.com.ar/sitemap.xml",
    };
}
