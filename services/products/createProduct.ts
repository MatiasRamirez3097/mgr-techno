import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { generateUniqueProductSlug } from "@/lib/products/generateUniqueSlug";
import { calculateBundleMetrics } from "@/lib/products/recalculateBundlesStock";
import { revalidateProductsCache } from "./getCatalogProducts";

import type { CreateProductDTO } from "@/lib/validators/productSchema";

export async function createProduct(data: CreateProductDTO) {
    await connectDB();

    // =========================
    // NORMALIZE
    // =========================

    const salePrice =
        data.salePrice && data.salePrice > 0 ? data.salePrice : null;

    // =========================
    // BRAND
    // =========================

    const brand =
        data.brand && data.brand.trim() !== "" && Types.ObjectId.isValid(data.brand)
            ? new Types.ObjectId(data.brand)
            : undefined;

    // =========================
    // CATEGORIES
    // =========================

    const categories =
        data.categories?.map((id) => new Types.ObjectId(id)) || [];

    const slug = data.slug || (await generateUniqueProductSlug(data.name));

    // =========================
    // BUNDLE / SIMPLE METRICS
    // =========================
    const isBundle = data.type === "bundle";
    let finalRegularPrice = data.regularPrice;
    let finalAvailableStock = 0;
    let finalIsAvailable = false;
    let finalBundleItems: { productId: Types.ObjectId; quantity: number }[] = [];
    let finalBundleItemsCount = 0;

    if (isBundle) {
        const metrics = await calculateBundleMetrics(data.bundleItems || []);
        finalRegularPrice = metrics.regularPrice;
        finalAvailableStock = metrics.availableStock;
        finalIsAvailable = metrics.isAvailable;
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

    // =========================
    // CREATE
    // =========================

    const product = await ProductModel.create({
        name: data.name,

        slug,

        brand,

        type: data.type || "simple",

        effectivePrice:
            salePrice !== null && salePrice > 0 && salePrice < finalRegularPrice
                ? salePrice
                : finalRegularPrice,

        availableStock: finalAvailableStock,
        totalStock: finalAvailableStock,
        isAvailable: finalIsAvailable,

        regularPrice: finalRegularPrice,

        salePrice,

        taxRate: data.taxRate,

        image: data.image || "",

        images: data.images || [],

        hasSerialNumber: isBundle ? false : data.hasSerialNumber,

        manageStock: data.manageStock,

        shortDescription: data.shortDescription,

        description: data.description,

        weight: data.weight,

        dimensions: data.dimensions,

        categories,

        featured: data.featured,

        status: data.status,

        sku: data.sku,

        mpn: data.mpn,

        gtin: data.gtin,

        bundleItemsCount: finalBundleItemsCount,
        bundleItems: finalBundleItems,

        attributes: Array.isArray(data.attributes) ? data.attributes : [],

        hasFreeShipping: data.hasFreeShipping ?? false,

        shippingSize: data.shippingSize || "standard",
    });

    revalidateProductsCache();

    return mapProductToDTO(product.toObject());
}
