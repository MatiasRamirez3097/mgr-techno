import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";

import { generateProductSearch } from "@/lib/search/generateProductSearch";

import type { CreateProductDTO } from "@/lib/validators/productSchema";

export async function createProduct(data: CreateProductDTO) {
    await connectDB();

    // =========================
    // NORMALIZE
    // =========================

    const salePrice =
        data.salePrice && data.salePrice > 0 ? data.salePrice : null;

    // =========================
    // CATEGORIES
    // =========================

    const categories =
        data.categories?.map((id) => new Types.ObjectId(id)) || [];

    // =========================
    // SEARCH
    // =========================

    const searchData = generateProductSearch(`
            ${data.name}
            ${data.sku || ""}
            ${data.mpn || ""}
            ${data.gtin || ""}
        `);

    // =========================
    // CREATE
    // =========================

    const product = await ProductModel.create({
        name: data.name,

        slug: data.slug,

        type: data.type,

        effectivePrice:
            data.salePrice &&
            data.salePrice > 0 &&
            data.salePrice > data.regularPrice
                ? data.salePrice
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
    });

    return mapProductToDTO(product.toObject());
}
