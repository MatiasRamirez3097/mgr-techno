import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";
import { revalidateProductsCache } from "./getCatalogProducts";

export async function deleteProductById(id: string) {
    await connectDB();

    const product = await ProductModel.findById(id);

    if (!product) {
        throw new Error("Producto no encontrado");
    }

    if (product.type !== "bundle") {
        const currentStock =
            (product.availableStock || 0) +
            (product.reservedStock || 0) +
            (product.totalStock || 0);
        if (currentStock > 0) {
            throw new Error(
                `No se puede eliminar el producto "${product.name}" porque posee stock (${product.availableStock || 0} u. disponibles). Cambie su estado a borrador o privado, o ajuste el stock antes de eliminarlo.`,
            );
        }

        const hasInventory = await InventoryItemModel.exists({ productId: id });
        if (hasInventory) {
            throw new Error(
                `No se puede eliminar el producto "${product.name}" porque posee unidades registradas en el inventario. Se recomienda pasarlo a estado "draft" o "private" para conservarlo archivado.`,
            );
        }

        const parentBundle = await ProductModel.findOne({
            type: "bundle",
            "bundleItems.productId": id,
        })
            .select("name")
            .lean();

        if (parentBundle) {
            throw new Error(
                `No se puede eliminar el producto "${product.name}" porque forma parte del combo "${(parentBundle as any).name}". Quitá primero el producto de ese combo.`,
            );
        }
    }

    await ProductModel.findByIdAndDelete(id);
    revalidateProductsCache();

    return product;
}
