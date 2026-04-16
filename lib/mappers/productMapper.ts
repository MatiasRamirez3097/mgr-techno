// /lib/mappers/productMapper.ts

import { ProductDB } from "@/types/backend/product";
import { ProductDTO } from "@/types/shared/product";

export function mapProductToDTO(product: ProductDB): ProductDTO {
    return {
        id: product._id.toString(),
        image: product.image || "",
        images: product.images || [],
        name: product.name,
        onSale: product.onSale,
        listPrice: product.listPrice || 0,
        price: product.price,
        priceNoTax: product.priceNoTax || 0,
        regularListPrice: product.regularPrice || 0,
        regularPrice: product.regularPrice || 0,
        shortDescription: product.shortDescription || "",
        slug: product.slug,
        stock: product.stock || 0,
    };
}
