import type { NormalizedProduct } from "@/types/shared/distributor";

// Máximo de productos por página de la API de Elit (pedir más devuelve 100 igual)
export const ELIT_PAGE_SIZE = 100;

// Producto tal como lo devuelve la API de Elit (sólo los campos que usamos)
export interface ElitRawProduct {
    id: number;
    codigo_producto?: string | null;
    nombre: string;
    marca?: string | null;
    // pvp_ars = precio (USD, neto) + IVA, por la cotización de Elit: es nuestro costo con IVA en pesos
    pvp_ars?: number | string | null;
    iva?: number | string | null;
    stock_total?: number | string | null;
    imagenes?: string[] | null;
    link?: string | null;
}

export function mapElitProduct(prod: ElitRawProduct): NormalizedProduct {
    return {
        id: prod.id,
        distributor: "Elit",
        sku: prod.codigo_producto || prod.id.toString(),
        name: prod.marca ? `${prod.marca} ${prod.nombre}` : prod.nombre,
        price: Number(prod.pvp_ars) || 0,
        stock: Number(prod.stock_total) || 0,
        image: prod.imagenes?.[0] || null,
        link: prod.link || null,
        ...(Number(prod.iva) > 0 ? { taxRate: Number(prod.iva) } : {}),
    };
}

/** Offsets de las páginas de Elit: empiezan en 1 y avanzan de a ELIT_PAGE_SIZE (1, 101, 201…). */
export function elitPageOffsets(total: number, pageSize = ELIT_PAGE_SIZE): number[] {
    const pages = Math.ceil(Math.max(0, total) / pageSize);
    return Array.from({ length: pages }, (_, i) => 1 + i * pageSize);
}
