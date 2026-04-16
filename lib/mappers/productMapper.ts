// /lib/mappers/productMapper.ts

import { ProductDB } from "@/types/backend/product";
import { ProductDTO } from "@/types/shared/product";

export function mapProductToDTO(product: ProductDB): ProductDTO {
    return {
        id: product._id.toString(),
        image: product.image || "",
        images: product.images || [],
        name: product.name,
        price: product.price,
        slug: product.slug,
        stock: product.stock || 0,
    };
}
