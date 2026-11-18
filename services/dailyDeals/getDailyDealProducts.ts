import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models";
import { mapProductToDTO } from "@/lib/mappers/productMapper";
import type { ProductDTO } from "@/types/shared/product";

/** Productos de la oferta del día visibles en la tienda, en el orden del sorteo. */
export async function getDailyDealProducts(productIds: string[]): Promise<ProductDTO[]> {
    if (productIds.length === 0) return [];
    await connectDB();
    const products = await ProductModel.find({
        _id: { $in: productIds },
        status: "publish",
        isAvailable: true,
    }).lean();
    const byId = new Map(products.map((p) => [String(p._id), mapProductToDTO(p)]));
    return productIds.map((id) => byId.get(id)).filter((p): p is ProductDTO => Boolean(p));
}
