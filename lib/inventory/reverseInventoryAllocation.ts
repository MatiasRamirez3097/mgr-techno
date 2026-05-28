import { ClientSession } from "mongoose";

import { InventoryItemModel, OrderModel, ProductModel } from "@/models";

export async function reverseInventoryAllocation(
    orderId: string,
    session: ClientSession,
) {
    const order = await OrderModel.findById(orderId).session(session);

    if (!order) {
        throw new Error("Orden no encontrada");
    }

    if (!order.inventoryAllocatedAt) {
        throw new Error("La orden no tiene inventario asignado");
    }

    for (const item of order.items) {
        const product = await ProductModel.findById(item.productId).session(
            session,
        );

        if (!product) {
            throw new Error("Producto no encontrado");
        }

        // =====================================
        // SERIALIZADOS
        // =====================================

        if (product.hasSerialNumber) {
            const inventoryIds = item.allocations.map(
                (a: any) => a.inventoryItemId,
            );

            const updated = await InventoryItemModel.updateMany(
                {
                    _id: {
                        $in: inventoryIds,
                    },

                    status: "sold",
                },
                {
                    $set: {
                        status: "available",

                        saleId: null,
                    },
                },
                { session },
            );

            if (updated.modifiedCount !== inventoryIds.length) {
                throw new Error(
                    `Error revirtiendo seriales de ${product.name}`,
                );
            }
        }

        // =====================================
        // NO SERIALIZADOS
        // =====================================
        else {
            for (const allocation of item.allocations) {
                const updated = await InventoryItemModel.updateOne(
                    {
                        _id: allocation.inventoryItemId,

                        productId: product._id,
                    },
                    {
                        $inc: {
                            remainingQuantity: allocation.quantity,
                        },
                    },
                    { session },
                );

                if (updated.modifiedCount === 0) {
                    throw new Error(
                        `Error revirtiendo lote de ${product.name}`,
                    );
                }
            }
        }

        // =====================================
        // PRODUCT STOCK
        // =====================================

        const updatedProduct = await ProductModel.updateOne(
            {
                _id: product._id,
            },
            {
                $inc: {
                    totalStock: item.quantity,

                    availableStock: item.quantity,
                },
            },
            { session },
        );

        if (updatedProduct.modifiedCount === 0) {
            throw new Error(`Error actualizando stock de ${product.name}`);
        }
    }

    // =====================================
    // ORDER
    // =====================================

    order.inventoryAllocatedAt = null;

    await order.save({ session });
}
