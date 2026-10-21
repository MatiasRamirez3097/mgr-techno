import { ProductModel } from "@/models";
import { connectDB } from "@/lib/mongodb";

export async function duplicateProductToOutlet(id: string) {
    await connectDB();

    const originalProduct = await ProductModel.findById(id).lean();

    if (!originalProduct) {
        throw new Error("Producto no encontrado");
    }

    const {
        _id,
        createdAt,
        updatedAt,
        slug,
        sku,
        name,
        availableStock,
        reservedStock,
        totalStock,
        isAvailable,
        ...restOfProduct
    } = originalProduct as Record<string, unknown>;

    const baseSlug = `${String(slug || "producto")}-outlet`;
    let newSlug = baseSlug;
    let counter = 1;

    while (await ProductModel.exists({ slug: newSlug })) {
        counter++;
        newSlug = `${baseSlug}-${counter}`;
    }

    const newProductData = {
        ...restOfProduct,
        name: `${String(name || "Producto")} (OUTLET)`,
        slug: newSlug,
        sku: sku ? `${String(sku)}-OUT` : undefined,
        isOutlet: true,
        status: "draft",
        availableStock: 0,
        reservedStock: 0,
        totalStock: 0,
        isAvailable: false,
    };

    const newOutletProduct = await ProductModel.create(newProductData);

    return {
        id: newOutletProduct._id.toString(),
        slug: newOutletProduct.slug,
    };
}
