import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import { generateUniqueProductSlug } from "./generateUniqueSlug";
import { revalidateProductsCache } from "./getCatalogProducts";
import type { CreateQuickProductDTO } from "@/lib/validators/productSchema";

export async function createQuickProduct(data: CreateQuickProductDTO) {
    await connectDB();

    const slug = await generateUniqueProductSlug(data.name);

    const brand =
        data.brand && data.brand.trim() !== "" && Types.ObjectId.isValid(data.brand)
            ? new Types.ObjectId(data.brand)
            : undefined;

    const categories =
        data.categoryId &&
        data.categoryId.trim() !== "" &&
        Types.ObjectId.isValid(data.categoryId)
            ? [new Types.ObjectId(data.categoryId)]
            : [];

    const finalRegularPrice =
        typeof data.regularPrice === "number" && data.regularPrice > 0
            ? data.regularPrice
            : typeof data.costPrice === "number" && data.costPrice > 0
              ? data.costPrice
              : 0;

    const product = await ProductModel.create({
        name: data.name,
        slug,
        brand,
        type: "simple",
        regularPrice: finalRegularPrice,
        salePrice: null,
        effectivePrice: finalRegularPrice,
        taxRate: data.taxRate ?? 10.5,
        availableStock: 0,
        reservedStock: 0,
        totalStock: 0,
        isAvailable: false,
        hasSerialNumber: Boolean(data.hasSerialNumber),
        manageStock: true,
        status: "pending_review",
        sku: data.sku ? data.sku.trim() : undefined,
        categories,
        attributes: [],
    });

    revalidateProductsCache();

    return {
        ...mapProductToDTO(product.toObject()),
        costPrice: data.costPrice || 0,
    };
}
