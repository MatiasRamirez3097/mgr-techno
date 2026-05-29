import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";

import { generateProductSearch } from "@/lib/search/generateProductSearch";

export async function updateProductById(id: string, data: any) {
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
    // SEARCH
    // =========================

    const searchData = generateProductSearch(`
            ${data.name}
            ${data.sku || ""}
        `);

    // =========================
    // CATEGORIES
    // =========================

    const categories =
        data.categories?.map((id: any) => new Types.ObjectId(id)) || [];

    // =========================
    // UPDATE
    // =========================

    product.name = data.name;

    product.slug = data.slug;

    product.type = data.type;

    product.searchTerms = searchData.searchTerms;

    product.regularPrice = data.regularPrice;

    product.salePrice = salePrice;

    product.taxRate = data.taxRate;

    product.images = data.images || [];

    product.hasSerialNumber = data.hasSerialNumber;

    product.manageStock = data.manageStock;

    product.shortDescription = data.shortDescription;

    product.description = data.description;

    product.weight = data.weight;

    product.dimensions = data.dimensions;

    product.categories = categories;

    product.featured = data.featured;

    product.status = data.status;

    product.sku = data.sku;

    product.bundleItemsCount = data.bundleItemsCount;

    // =========================
    // SAVE
    // =========================

    await product.save();

    return mapProductToDTO(product.toObject());
}
