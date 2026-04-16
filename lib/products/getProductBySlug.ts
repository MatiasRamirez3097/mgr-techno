import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";

import { mapProductToDTO } from "@/lib/mappers/productMapper";
//types
import type { ProductDTO } from "@/types/shared/product";

export async function getProductBySlug(
    slug: string,
): Promise<ProductDTO | null> {
    await connectDB();
    const product = await ProductModel.findOne({
        slug,
        status: "publish",
    }).lean();
    if (!product) return null;
    return product.map(mapProductToDTO);
}
