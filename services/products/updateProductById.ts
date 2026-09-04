import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";

import { generateProductSearch } from "@/lib/search/generateProductSearch";
import { slugify } from "@/lib/utils/slugify";

import { buildProductDerivedFields } from "./utils";

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
            ${data.mpn || ""}
            ${data.gtin || ""}
        `);

    // =========================
    // CATEGORIES
    // =========================

    const categories =
        data.categories?.map((id: any) => new Types.ObjectId(id)) || [];

    const derived = buildProductDerivedFields({
        regularPrice: data.regularPrice ?? undefined,
        salePrice: data.salePrice ?? undefined,
        availableStock: product.availableStock ?? undefined,
    });

    // =========================
    // UPDATE
    // =========================

    product.name = data.name;
    product.brand = data.brand;
    product.slug = slugify(data.name);
    product.type = data.type;
    product.regularPrice = data.regularPrice;
    product.salePrice = salePrice;
    product.effectivePrice = derived.effectivePrice;
    product.taxRate = data.taxRate;
    product.image = data.image || "";
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
    product.mpn = data.mpn;
    product.gtin = data.gtin;
    product.bundleItemsCount = data.bundleItemsCount;
    product.hasFreeShipping = data.hasFreeShipping ?? false;
    product.shippingSize = data.shippingSize || "standard";

    // =========================
    // SAVE
    // =========================

    await product.save();

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

    if (data.regularPrice !== undefined) {
        product.regularPrice = data.regularPrice;
        product.effectivePrice = data.regularPrice;
    }

    if (data.salePrice !== undefined) {
        if (data.salePrice && data.salePrice > 0) {
            product.salePrice = data.salePrice;
            product.effectivePrice = data.salePrice;
        } else {
            product.salePrice = null;
        }
    }

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

    return mapProductToDTO(product.toObject());
}
