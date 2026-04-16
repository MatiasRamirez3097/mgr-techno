import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";

import { mapProductToDTO } from "@/lib/mappers/productMapper";
//types
import type { ProductDTO } from "@/types/shared/product";

export async function getProductsById(id: string): Promise<ProductDTO | null> {
    await connectDB();
    const product = await ProductModel.findById(id).lean();
    if (!product) return null;
    return mapProductToDTO(product);
}
