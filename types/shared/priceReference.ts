// Cómo se vinculó un producto con una tienda de referencia
export type ReferenceMatchMethod = "part_number" | "ean" | "name" | "manual";

// Ítem del catálogo de una tienda de referencia, tal como lo ve el admin
export interface ReferenceItemDTO {
    itemId: string;
    source: string;
    sourceLabel: string;
    url: string;
    name: string;
    sku: string;
    // Precio vigente (oferta si la hay) y de lista, en ARS
    price: number | null;
    listPrice: number | null;
    inStock: boolean;
    fetchedAt: string | null;
    // Último cambio del precio vigente
    previousPrice: number | null;
    priceChangedAt: string | null;
    // false si salió del sitemap de la tienda o su página da 404
    available: boolean;
}

export interface ProductReferenceLinkDTO extends ReferenceItemDTO {
    id: string;
    productId: string;
    matchMethod: ReferenceMatchMethod;
    createdAt: string;
}

// Candidato para vincular (sugerencia o resultado de búsqueda)
export interface ReferenceCandidateDTO extends ReferenceItemDTO {
    matchMethod: ReferenceMatchMethod;
    // Código que coincidió (part number / EAN) o similitud del nombre (0 a 1)
    matchedValue: string;
    score: number;
}

export interface ReferenceAutoLinkReport {
    linked: number;
    // Productos con más de un ítem con el mismo código en una tienda: se resuelven a mano
    ambiguous: number;
}
