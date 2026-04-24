import { ProductModel } from "@/models/Product";
import { Types } from "mongoose";
import type { CreateProductDTO } from "@/lib/validators/productSchema";

export async function createProduct(data: CreateProductDTO) {
    // 🧠 normalizar salePrice
    const salePrice =
        data.salePrice && data.salePrice > 0 ? data.salePrice : null;

    // 🧠 convertir categorías a ObjectId
    const categories = data.categories?.map((id) => new Types.ObjectId(id));

    // 🚀 create
    const product = await ProductModel.create({
        name: data.name,
        slug: data.slug,
        type: data.type,

        regularPrice: data.regularPrice,
        salePrice,

        taxRate: data.taxRate,

        image: data.image,
        images: data.images,

        hasSerialNumber: data.hasSerialNumber,
        manageStock: data.manageStock,

        stockQuantity: data.stockQuantity,
        stockStatus: data.stockStatus,

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

    return product;
}
