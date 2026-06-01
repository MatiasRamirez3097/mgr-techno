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

    const searchData = generateProductSearch(data.name);

    // =========================
    // CREATE
    // =========================

    const product = await ProductModel.create({
        name: data.name,

        slug: data.slug,

        type: data.type,

        searchTerms: searchData.searchTerms,

        regularPrice: data.regularPrice,

        salePrice,

        taxRate: data.taxRate,

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

        bundleItemsCount: data.bundleItemsCount,
    });

    return mapProductToDTO(product.toObject());
}
