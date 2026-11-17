/**
 * Tiendas que se usan como referencia de precio de venta. Cada una se recorre con el lector
 * que corresponde a su plataforma; hoy sólo hay sitios WooCommerce (sitemap + JSON-LD).
 */
export type ReferenceSourceType = "sitemap-jsonld";

export interface ReferenceSource {
    key: string;
    label: string;
    type: ReferenceSourceType;
    baseUrl: string;
    /** Índice de sitemaps del sitio */
    sitemapUrl: string;
    /** Qué sitemaps del índice listan productos */
    productSitemapPattern: RegExp;
}

export const REFERENCE_SOURCES: ReferenceSource[] = [
    {
        key: "hardcore",
        label: "Hardcore Computación",
        type: "sitemap-jsonld",
        baseUrl: "https://hardcorecomputacion.com.ar",
        sitemapUrl: "https://hardcorecomputacion.com.ar/wp-sitemap.xml",
        productSitemapPattern: /wp-sitemap-posts-product-\d+\.xml$/,
    },
];

export const REFERENCE_SOURCE_KEYS = REFERENCE_SOURCES.map((s) => s.key);

export function getReferenceSource(key: string): ReferenceSource | null {
    return REFERENCE_SOURCES.find((s) => s.key === key) ?? null;
}

/** Id del documento de DistributorSyncState que guarda el lock y el estado de cada fuente */
export const referenceStateId = (key: string) => `price-reference:${key}`;
