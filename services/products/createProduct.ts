import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { generateUniqueProductSlug } from "@/lib/products/generateUniqueSlug";
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
    // CREATE
    // =========================

    const product = await ProductModel.create({
        name: data.name,

        slug,

        brand,

        type: data.type,

        effectivePrice: (salePrice !== null && salePrice > 0 && salePrice < data.regularPrice)
            ? salePrice
            : data.regularPrice,

        isAvailable: false,

        regularPrice: data.regularPrice,

        salePrice,

        taxRate: data.taxRate,

        image: data.image || "",

        images: data.images || [],

        hasSerialNumber: data.hasSerialNumber,

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

        bundleItemsCount: data.bundleItemsCount,

        hasFreeShipping: data.hasFreeShipping ?? false,

        shippingSize: data.shippingSize || "standard",
    });

    revalidateProductsCache();

    return mapProductToDTO(product.toObject());
}
