import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";

import { generateUniqueProductSlug } from "@/lib/products/generateUniqueSlug";
import {
    calculateBundleMetrics,
    recalculateBundlesForProducts,
} from "@/lib/products/recalculateBundlesStock";
import { buildProductDerivedFields } from "./utils";
import { revalidateProductsCache } from "./getCatalogProducts";

export async function updateProductById(id: string, data: Record<string, any>) {
    await connectDB();

    // =========================
    // FIND
    // =========================

    const product = await ProductModel.findById(id);

    if (!product) {
        throw new Error("Producto no encontrado");
    }

    // =========================
    // NORMALIZE
    // =========================
    const salePrice =
        data.salePrice && data.salePrice > 0 ? data.salePrice : null;

    // =========================
    // CATEGORIES
    // =========================

    const categories =
        data.categories?.map((catId: string | Types.ObjectId) => new Types.ObjectId(catId)) || [];

    const isBundle = (data.type ?? product.type) === "bundle";
    let finalRegularPrice = data.regularPrice;
    let finalAvailableStock = product.availableStock ?? 0;
    let finalBundleItems = product.bundleItems || [];
    let finalBundleItemsCount = product.bundleItemsCount || 0;

    if (isBundle) {
        const rawBundleItems = data.bundleItems ?? product.bundleItems ?? [];
        const metrics = await calculateBundleMetrics(
            rawBundleItems.map((bi: any) => ({
                productId: bi.productId.toString(),
                quantity: Number(bi.quantity) || 1,
            })),
        );
        finalRegularPrice = metrics.regularPrice;
        finalAvailableStock = metrics.availableStock;
        finalBundleItems = metrics.normalizedBundleItems;
        finalBundleItemsCount = metrics.bundleItemsCount;

        if (!salePrice || salePrice <= 0) {
            throw new Error(
                "El precio de oferta es obligatorio para un producto tipo combo",
            );
        }
        if (salePrice >= finalRegularPrice) {
            throw new Error(
                `El precio de oferta del combo ($${salePrice}) debe ser menor a la suma de precios regulares de sus componentes ($${finalRegularPrice})`,
            );
        }
    }

    const derived = buildProductDerivedFields({
        regularPrice: finalRegularPrice ?? undefined,
        salePrice: salePrice ?? undefined,
        availableStock: finalAvailableStock ?? undefined,
    });

    // =========================
    // UPDATE
    // =========================

    const brand =
        data.brand && typeof data.brand === "string" && data.brand.trim() !== "" && Types.ObjectId.isValid(data.brand)
            ? new Types.ObjectId(data.brand)
            : undefined;

    if (!product.slug) {
        product.slug = await generateUniqueProductSlug(data.name, id);
    } else if (data.slug && data.slug !== product.slug) {
        product.slug = await generateUniqueProductSlug(data.slug, id);
    }

    product.name = data.name;
    product.brand = brand;
    product.type = isBundle ? "bundle" : "simple";
    product.regularPrice = finalRegularPrice;
    product.salePrice = salePrice;
    product.effectivePrice = derived.effectivePrice;
    product.availableStock = finalAvailableStock;
    if (isBundle) {
        product.totalStock = finalAvailableStock;
    }
    product.isAvailable = finalAvailableStock > 0;
    product.taxRate = data.taxRate;
    product.image = data.image || "";
    product.images = data.images || [];
    product.hasSerialNumber = isBundle ? false : data.hasSerialNumber;
    product.manageStock = data.manageStock;
    product.shortDescription = data.shortDescription;
    product.description = data.description;
    product.weight = data.weight;
    product.dimensions = data.dimensions;
    product.categories = categories;
    product.featured = data.featured;
    product.status = data.status;
    product.sku = data.sku;
    product.mpn = data.mpn;
    product.gtin = data.gtin;
    product.bundleItemsCount = isBundle ? finalBundleItemsCount : 0;
    product.bundleItems = isBundle ? finalBundleItems : [];
    if (Array.isArray(data.attributes)) {
        product.attributes = data.attributes;
    }
    product.hasFreeShipping = data.hasFreeShipping ?? false;
    product.shippingSize = data.shippingSize || "standard";

    // =========================
    // SAVE
    // =========================

    await product.save();

    // Si es un producto simple, sincronizar los combos que lo contengan (por si cambió su regularPrice)
    if (!isBundle) {
        await recalculateBundlesForProducts([id]);
    }

    revalidateProductsCache();

    return mapProductToDTO(product.toObject());
}

export async function updateProductQuickFields(
    id: string,
    data: {
        regularPrice?: number;
        salePrice?: number | null;
        featured?: boolean;
        status?: string;
        hasFreeShipping?: boolean;
    },
) {
    await connectDB();

    const product = await ProductModel.findById(id);

    if (!product) {
        throw new Error("Producto no encontrado");
    }

    const isBundle = product.type === "bundle";

    // Para un combo, su regularPrice depende de sus componentes y no se edita manualmente
    const newRegularPrice =
        !isBundle &&
        data.regularPrice !== undefined &&
        data.regularPrice !== null &&
        !isNaN(Number(data.regularPrice))
            ? Number(data.regularPrice)
            : product.regularPrice;

    let newSalePrice: number | null = product.salePrice;
    if (data.salePrice !== undefined) {
        if (data.salePrice !== null && Number(data.salePrice) > 0) {
            newSalePrice = Number(data.salePrice);
        } else if (!isBundle) {
            newSalePrice = null;
        }
    }

    product.regularPrice = newRegularPrice;
    product.salePrice = newSalePrice;

    const derived = buildProductDerivedFields({
        regularPrice: newRegularPrice,
        salePrice: newSalePrice,
        availableStock: product.availableStock ?? 0,
    });
    product.effectivePrice = derived.effectivePrice;

    if (data.featured !== undefined) {
        product.featured = data.featured;
    }

    if (data.status !== undefined) {
        product.status = data.status;
    }

    if (data.hasFreeShipping !== undefined) {
        product.hasFreeShipping = data.hasFreeShipping;
    }

    await product.save();

    if (!isBundle && data.regularPrice !== undefined) {
        await recalculateBundlesForProducts([id]);
    }

    revalidateProductsCache();

    return mapProductToDTO(product.toObject());
}
