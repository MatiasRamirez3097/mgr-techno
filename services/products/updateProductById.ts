import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";

import { generateUniqueProductSlug } from "@/lib/products/generateUniqueSlug";
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

    const derived = buildProductDerivedFields({
        regularPrice: data.regularPrice ?? undefined,
        salePrice: data.salePrice ?? undefined,
        availableStock: product.availableStock ?? undefined,
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

    const newRegularPrice =
        data.regularPrice !== undefined && data.regularPrice !== null && !isNaN(Number(data.regularPrice))
            ? Number(data.regularPrice)
            : product.regularPrice;

    let newSalePrice: number | null = product.salePrice;
    if (data.salePrice !== undefined) {
        if (data.salePrice !== null && Number(data.salePrice) > 0) {
            newSalePrice = Number(data.salePrice);
        } else {
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
    revalidateProductsCache();

    return mapProductToDTO(product.toObject());
}
