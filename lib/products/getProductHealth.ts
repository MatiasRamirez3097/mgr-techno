import type { ProductDTO } from "@/types/shared/product";
import type { CategoryDTO } from "@/types/shared/category";
import { getEffectiveCategoryAttributeDefinitions } from "@/lib/categories/getEffectiveCategoryAttributes";

export interface MissingProductAttribute {
    key: string;
    label: string;
    required: boolean;
}

export interface ProductHealth {
    score: number;
    critical: string[];
    warnings: string[];
    missingAttributes: MissingProductAttribute[];
    totalCategoryAttributes: number;
}

export function getProductHealth(
    product: ProductDTO,
    allCategories?: CategoryDTO[],
): ProductHealth {
    const critical: string[] = [];
    const warnings: string[] = [];
    const missingAttributes: MissingProductAttribute[] = [];

    // ===== CRÍTICOS =====

    if (!product.name?.trim()) {
        critical.push("Sin nombre");
    }

    if (!product.sku?.trim()) {
        critical.push("Sin SKU");
    }

    if (!product.gtin?.trim()) {
        critical.push("Sin GTIN");
    }

    if (!product.regularPrice || product.regularPrice <= 0) {
        critical.push("Sin precio");
    }

    if (product.taxRate == null) {
        critical.push("Sin IVA");
    }

    const bundleComponentImagesCount =
        product.type === "bundle" && Array.isArray(product.bundleItems)
            ? product.bundleItems.filter((bi) => Boolean(bi.image)).length
            : 0;

    const totalImagesCount =
        (product.image ? 1 : 0) +
        (product.images?.length || 0) +
        bundleComponentImagesCount;

    if (totalImagesCount === 0) {
        critical.push("Sin imagen");
    }

    if (product.status !== "publish") {
        critical.push(
            product.status === "pending_review" ? "En revisión" : "Borrador",
        );
    }

    // ===== ADVERTENCIAS =====

    if (!product.description?.trim()) {
        warnings.push("Sin descripción");
    }

    if (!product.brand && product.type !== "bundle") {
        warnings.push("Sin marca");
    }

    if (totalImagesCount === 1) {
        warnings.push("Solo 1 imagen");
    }

    if (!product.weight) {
        warnings.push("Sin peso");
    }

    const hasDimensions =
        product.dimensions &&
        (Number(product.dimensions.length) > 0 ||
            Number(product.dimensions.width) > 0 ||
            Number(product.dimensions.height) > 0);

    if (!hasDimensions) {
        warnings.push("Sin dimensiones");
    }

    // ===== ATRIBUTOS DE CATEGORÍA =====
    let totalCategoryAttributes = 0;

    if (
        allCategories &&
        allCategories.length > 0 &&
        product.categories &&
        product.categories.length > 0
    ) {
        const effectiveDefs = getEffectiveCategoryAttributeDefinitions(
            product.categories,
            allCategories,
        );
        totalCategoryAttributes = effectiveDefs.length;

        const productAttrMap = new Map<string, any>();
        for (const attr of product.attributes || []) {
            if (attr.key) {
                productAttrMap.set(attr.key, attr.value);
            }
        }

        for (const def of effectiveDefs) {
            const val = productAttrMap.get(def.key);
            const hasValue =
                val !== undefined &&
                val !== null &&
                val !== "" &&
                !(Array.isArray(val) && val.length === 0);

            if (!hasValue) {
                missingAttributes.push({
                    key: def.key,
                    label: def.label,
                    required: Boolean(def.required),
                });
            }
        }
    }

    // ===== SCORE =====
    const missingRequiredCount = missingAttributes.filter(
        (m) => m.required,
    ).length;
    const missingOptionalCount =
        missingAttributes.length - missingRequiredCount;

    const totalChecks = 10 + totalCategoryAttributes;

    const failed =
        critical.length +
        warnings.length * 0.5 +
        missingRequiredCount * 1 +
        missingOptionalCount * 0.5;

    const score = Math.max(
        0,
        Math.round(((totalChecks - failed) / totalChecks) * 100),
    );

    return {
        score,
        critical,
        warnings,
        missingAttributes,
        totalCategoryAttributes,
    };
}
