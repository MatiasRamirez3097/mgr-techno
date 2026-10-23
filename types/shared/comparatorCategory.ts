export type ElitCategoryParam = "categoria" | "sub_categoria";

export interface ElitCategoryMapping {
    paramType: ElitCategoryParam;
    value: string;
}

// Categoría del comparador de distribuidores y su equivalente en cada mayorista
export interface ComparatorCategoryDTO {
    id: string;
    key: string;
    name: string;
    order: number;
    active: boolean;
    elit: ElitCategoryMapping[];
    // Descripción de la categoría de NewBytes (GET /v1/categories)
    newbytes: string[];
    // IDs numéricos de categoría de Invid (también acepta nombres, ver buildCategoryNamePattern)
    invid: string[];
    // Códigos de rubro de AIR (ej: "001-0331")
    air: string[];
}

// Opciones para los selectores del formulario de mapeo
export interface DistributorCategoryOption {
    value: string;
    label: string;
    detail?: string;
}

// Listados de categorías de cada distribuidor para el formulario de mapeo
export interface DistributorCategoryOptions {
    elit: Record<ElitCategoryParam, DistributorCategoryOption[]>;
    newbytes: DistributorCategoryOption[];
    invid: DistributorCategoryOption[];
    air: DistributorCategoryOption[];
    // Distribuidores cuyo listado no se pudo obtener
    errors: string[];
}
