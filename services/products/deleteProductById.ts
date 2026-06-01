import { connectDB } from "@/lib/mongodb";

import { ProductModel } from "@/models";

export async function deleteProductById(id: string) {
    await connectDB();

    const product = await ProductModel.findByIdAndDelete(id);

    if (!product) {
        throw new Error("Producto no encontrado");
    }

    return product;
}
