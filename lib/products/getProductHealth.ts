// lib/products/getProductHealth.ts

import type { ProductDTO } from "@/types/shared/product";

export interface ProductHealth {
    score: number;
    critical: string[];
    warnings: string[];
}

export function getProductHealth(product: ProductDTO): ProductHealth {
    const critical: string[] = [];
    const warnings: string[] = [];

    // ===== CRÍTICOS =====

    if (!product.name?.trim()) {
        critical.push("Sin nombre");
    }

    if (!product.sku?.trim()) {
        critical.push("Sin SKU");
    }

    if (!product.regularPrice || product.regularPrice <= 0) {
        critical.push("Sin precio");
    }

    if (product.taxRate == null) {
        critical.push("Sin IVA");
    }

    if (!product.images?.length) {
        critical.push("Sin imagen");
    }

    if (product.status !== "publish") {
        critical.push("Borrador");
    }

    // ===== ADVERTENCIAS =====

    if (!product.description?.trim()) {
        warnings.push("Sin descripción");
    }

    if (!product.brand) {
        warnings.push("Sin marca");
    }

    if (product.image && product.images?.length === 0) {
        warnings.push("Solo 1 imagen");
    }

    if (!product.weight) {
        warnings.push("Sin peso");
    }

    if (!product.dimensions) {
        warnings.push("Sin dimensiones");
    }

    // ===== SCORE =====

    const totalChecks = 10;

    const failed = critical.length + warnings.length * 0.5;

    const score = Math.max(
        0,
        Math.round(((totalChecks - failed) / totalChecks) * 100),
    );

    return {
        score,
        critical,
        warnings,
    };
}
