import { ProductModel } from "@/models/Product";

export async function updateProductById(id: string, data: any) {
    const product = await ProductModel.findByIdAndUpdate(id);
    if (!product) {
        throw new Error("Producto no encontrado");
    }

    // 🧠 sanitización
    if (!data.salePrice || data.salePrice <= 0) {
        data.salePrice = null;
    }

    Object.assign(product, data);

    await product.save(); // ✔ corre validators

    return product;
}
