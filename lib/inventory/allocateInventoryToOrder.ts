// lib/inventory/allocateInventoryToOrder.ts

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
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
    await connectDB();

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
                // NUEVO: VERIFICAR SI YA ESTABA ASIGNADO (OUTLET)
                // =====================================
                const isPreAllocated =
                    orderItem.allocations && orderItem.allocations.length > 0;

                // Solo descontamos inventario físico si NO fue asignado en el Checkout
                if (!isPreAllocated) {
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
                                `Stock insuficiente o ya vendido para ${product.name}`,
                            );
                        }

                        await InventoryItemModel.updateMany(
                            { _id: { $in: inventoryIds } },
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
                                    `Stock insuficiente en el lote para ${product.name}`,
                                );
                            }
                        }

                        if (totalAllocated !== orderItem.quantity) {
                            throw new Error(
                                `Cantidad inválida para ${product.name}`,
                            );
                        }
                    }

                    // Guardamos las asignaciones nuevas en la orden
                    orderItem.allocations = item.allocations;
                } else {
                    // =====================================
                    // SI YA ESTABA ASIGNADO (OUTLET)
                    // =====================================
                    // Opcional pero recomendado: Si es serializado de Outlet, aprovechamos
                    // y le cambiamos el estado a "sold" acá para mantener prolija la base de datos.
                    if (product.hasSerialNumber) {
                        const preAllocatedIds = orderItem.allocations.map(
                            (a: any) => a.inventoryItemId,
                        );
                        await InventoryItemModel.updateMany(
                            { _id: { $in: preAllocatedIds } },
                            {
                                $set: {
                                    status: "sold",
                                    saleId: order._id,
                                },
                            },
                            { session },
                        );
                    }
                }

                // =====================================
                // PRODUCT STOCK (Aplica a TODOS)
                // =====================================
                // Esto pasa el stock de "reservado" a "entregado definitivamente"
                const updatedProduct = await ProductModel.updateOne(
                    {
                        _id: product._id,
                        reservedStock: { $gte: orderItem.quantity },
                        totalStock: { $gte: orderItem.quantity },
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
