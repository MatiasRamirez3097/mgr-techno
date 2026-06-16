import { MetadataRoute } from "next";
import { getProductsBase } from "@/lib/products/getProductsBase";
import { getCategoriesBase } from "@/lib/categories/getCategoriesBase";

// Eliminamos "force-dynamic" y lo reemplazamos por revalidación diaria
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // CORRECCIÓN APLICADA: Dominio desnudo (sin www)
    const baseUrl = "https://mgrtechno.com.ar";

    // Páginas estáticas
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/productos`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        // NUEVO: Agregamos las páginas informativas que creaste
        {
            url: `${baseUrl}/metodos-de-pago`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${baseUrl}/envios`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.6,
        },
        {
            url: `${baseUrl}/cambios-y-devoluciones`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/como-comprar`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: `${baseUrl}/preguntas-frecuentes`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
    ];

    // Categorías
    const categories = await getCategoriesBase({ limit: 0 });
    const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
        url: `${baseUrl}/productos/categoria/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
    }));

    // Productos — traemos todos sin paginar
    const products = await getProductsBase({ limit: 0 });
    const productPages: MetadataRoute.Sitemap = products.map((product) => ({
        url: `${baseUrl}/productos/${product.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [...staticPages, ...categoryPages, ...productPages];
}
