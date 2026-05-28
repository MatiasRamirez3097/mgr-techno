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
    }).lean();

    if (!product) {
        return null;
    }

    return mapProductToDTO(product);
}
