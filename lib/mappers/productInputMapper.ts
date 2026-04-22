import { Types } from "mongoose";
import type { ProductInput } from "@/types/backend/productInput";
import type { ProductDB } from "@/types/backend/product";

export function mapInputToProductDB(input: ProductInput): Partial<ProductDB> {
    const price = Number(input.regularPrice) || 0;
    const salePrice = Number(input.salePrice) || 0;

    const onSale = salePrice < price;
    const finalPrice = onSale ? salePrice : price;

    const images =
        input.images
            ?.map((img) => (typeof img === "string" ? img : img.src || ""))
            .filter(Boolean) || [];

    return {
        name: input.name,
        slug: input.slug,
        status: input.status,

        description: input.description || "",
        shortDescription: input.shortDescription || "",

        regularPrice: price,
        salePrice,
        onSale,

        //manageStock: input.manageStock,
        stockQuantity: input.manageStock ? input.stockQuantity || 0 : 0,
        stockStatus: (input.stockQuantity || 0) > 0 ? "instock" : "outofstock",

        weight: Number(input.weight) || 0,

        dimensions: {
            length: Number(input.dimensions?.length) || 0,
            width: Number(input.dimensions?.width) || 0,
            height: Number(input.dimensions?.height) || 0,
        },

        categories: input.categories?.map((id) => new Types.ObjectId(id)) || [],

        featured: input.featured || false,

        image: images[0] || "",
        images,
    };
}
