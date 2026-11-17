/**
 * Tiendas que se usan como referencia de precio de venta. Cada una se lee con el lector que
 * corresponde a su plataforma:
 * - `sitemap-jsonld`: sitios WooCommerce; lista de URLs del sitemap y una página por producto.
 * - `catalog-json`: tiendas que publican el catálogo completo en un archivo JSON.
 */
interface BaseReferenceSource {
    key: string;
    label: string;
    /** Sigla para tablas angostas (el nombre completo va en el tooltip) */
    shortLabel: string;
    baseUrl: string;
}

export interface SitemapReferenceSource extends BaseReferenceSource {
    type: "sitemap-jsonld";
    /** Índice de sitemaps del sitio */
    sitemapUrl: string;
    /** Qué sitemaps del índice listan productos */
    productSitemapPattern: RegExp;
}

export interface CatalogReferenceSource extends BaseReferenceSource {
    type: "catalog-json";
    /** Archivo con el catálogo completo */
    catalogUrl: string;
    /** Prefijo de las imágenes de producto */
    imageBaseUrl: string;
}

export type ReferenceSource = SitemapReferenceSource | CatalogReferenceSource;
export type ReferenceSourceType = ReferenceSource["type"];

export const REFERENCE_SOURCES: ReferenceSource[] = [
    {
        key: "hardcore",
        label: "Hardcore Computación",
        shortLabel: "HC",
        type: "sitemap-jsonld",
        baseUrl: "https://hardcorecomputacion.com.ar",
        sitemapUrl: "https://hardcorecomputacion.com.ar/wp-sitemap.xml",
        productSitemapPattern: /wp-sitemap-posts-product-\d+\.xml$/,
    },
    {
        key: "compragamer",
        label: "Compra Gamer",
        shortLabel: "CG",
        type: "catalog-json",
        baseUrl: "https://compragamer.com",
        // Lo que descarga su tienda al entrar (modelo "Product" de su app)
        catalogUrl: "https://static.compragamer.com/productos",
        imageBaseUrl: "https://imagenes.compragamer.com/productos/compragamer_Imganen_general_",
    },
];

export const REFERENCE_SOURCE_KEYS = REFERENCE_SOURCES.map((s) => s.key);

export function getReferenceSource(key: string): ReferenceSource | null {
    return REFERENCE_SOURCES.find((s) => s.key === key) ?? null;
}

/** Id del documento de DistributorSyncState que guarda el lock y el estado de cada fuente */
export const referenceStateId = (key: string) => `price-reference:${key}`;
