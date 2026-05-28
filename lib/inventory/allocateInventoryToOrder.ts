// lib/inventory/allocateInventoryToOrder.ts

import mongoose from "mongoose";

import { OrderModel, ProductModel, InventoryItemModel } from "@/models";

type AllocationInput = {
    productId: string;

    allocations: {
        inventoryItemId: string;
        quantity: number;
    }[];
};

export async function allocateInventoryToOrder(
    orderId: string,
    items: AllocationInput[],
) {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const order = await OrderModel.findById(orderId).session(session);

            if (!order) {
                throw new Error("Orden no encontrada");
            }

            if (order.paymentStatus !== "paid") {
                throw new Error("La orden debe estar pagada");
            }

            if (order.inventoryAllocatedAt) {
                throw new Error("La orden ya tiene inventario asignado");
            }

            for (const item of items) {
                const orderItem = order.items.find(
                    (i: any) =>
                        i.productId.toString() === item.productId.toString(),
                );

                if (!orderItem) {
                    throw new Error("Producto no encontrado en la orden");
                }

                const product = await ProductModel.findById(
                    item.productId,
                ).session(session);

                if (!product) {
                    throw new Error("Producto no encontrado");
                }

                // =====================================
                // SERIALIZADOS
                // =====================================

                if (product.hasSerialNumber) {
                    if (item.allocations.length !== orderItem.quantity) {
                        throw new Error(
                            `Cantidad inválida para ${product.name}`,
                        );
                    }

                    const inventoryIds = item.allocations.map(
                        (a) => a.inventoryItemId,
                    );

                    const inventoryItems = await InventoryItemModel.find({
                        _id: { $in: inventoryIds },
                        productId: product._id,
                        status: "available",
                    }).session(session);

                    if (inventoryItems.length !== orderItem.quantity) {
                        throw new Error(
                            `Stock insuficiente para ${product.name}`,
                        );
                    }

                    await InventoryItemModel.updateMany(
                        {
                            _id: {
                                $in: inventoryIds,
                            },
                        },
                        {
                            $set: {
                                status: "sold",
                                saleId: order._id,
                            },
                        },
                        { session },
                    );
                }

                // =====================================
                // NO SERIALIZADOS
                // =====================================
                else {
                    let totalAllocated = 0;

                    for (const allocation of item.allocations) {
                        totalAllocated += allocation.quantity;

                        const updated = await InventoryItemModel.updateOne(
                            {
                                _id: allocation.inventoryItemId,
                                productId: product._id,
                                remainingQuantity: {
                                    $gte: allocation.quantity,
                                },
                            },
                            {
                                $inc: {
                                    remainingQuantity: -allocation.quantity,
                                },
                            },
                            { session },
                        );

                        if (updated.modifiedCount === 0) {
                            throw new Error(
                                `Stock insuficiente para ${product.name}`,
                            );
                        }
                    }

                    if (totalAllocated !== orderItem.quantity) {
                        throw new Error(
                            `Cantidad inválida para ${product.name}`,
                        );
                    }
                }

                // =====================================
                // PRODUCT STOCK
                // =====================================

                const updatedProduct = await ProductModel.updateOne(
                    {
                        _id: product._id,

                        reservedStock: {
                            $gte: orderItem.quantity,
                        },

                        totalStock: {
                            $gte: orderItem.quantity,
                        },
                    },
                    {
                        $inc: {
                            reservedStock: -orderItem.quantity,

                            totalStock: -orderItem.quantity,
                        },
                    },
                    { session },
                );

                if (updatedProduct.modifiedCount === 0) {
                    throw new Error(`Stock inconsistente en ${product.name}`);
                }

                // =====================================
                // SAVE ALLOCATIONS
                // =====================================

                orderItem.allocations = item.allocations;
            }

            // =====================================
            // ORDER STATUS
            // =====================================

            order.inventoryAllocatedAt = new Date();

            await order.save({ session });
        });
    } finally {
        session.endSession();
    }
}
