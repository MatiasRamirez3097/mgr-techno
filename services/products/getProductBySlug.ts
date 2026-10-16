// /services/products/getProductBySlug.ts

import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

import { mapProductToDTO } from "@/lib/mappers/productMapper";

export async function getProductBySlug(slug: string) {
    await connectDB();

    if (!slug?.trim()) {
        return null;
    }

    const product = await ProductModel.findOne({
        slug,
        status: "publish",
    })
        .populate({
            path: "bundleItems.productId",
            select: "name sku image regularPrice availableStock",
        })
        .lean();

    if (!product) {
        return null;
    }

    return mapProductToDTO(product);
}
