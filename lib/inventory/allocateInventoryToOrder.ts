// lib/inventory/allocateInventoryToOrder.ts

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { OrderModel, ProductModel, InventoryItemModel } from "@/models";

type AllocationInput = {
    orderItemIndex?: number;
    productId: string;
    componentProductId?: string;
    componentName?: string;
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

            // Limpiar asignaciones previas en combos antes de acumular sus componentes
            const clearedBundleOrderItemIds = new Set<string>();

            for (const item of items) {
                const orderItem =
                    typeof item.orderItemIndex === "number"
                        ? order.items[item.orderItemIndex]
                        : order.items.find(
                              (i: any) =>
                                  i.productId.toString() ===
                                  item.productId.toString(),
                          );

                if (!orderItem) {
                    throw new Error("Producto no encontrado en la orden");
                }

                // Determinar si estamos asignando un componente de un combo o un producto simple
                const isBundleComponent = Boolean(item.componentProductId);

                if (isBundleComponent) {
                    const parentKey =
                        typeof item.orderItemIndex === "number"
                            ? `${item.orderItemIndex}::${orderItem.productId.toString()}`
                            : orderItem.productId.toString();

                    if (!clearedBundleOrderItemIds.has(parentKey)) {
                        orderItem.allocations = [];
                        clearedBundleOrderItemIds.add(parentKey);
                    }

                    const compProduct = await ProductModel.findById(
                        item.componentProductId,
                    ).session(session);

                    if (!compProduct) {
                        throw new Error(
                            "Producto componente del combo no encontrado",
                        );
                    }

                    // Determinar cantidad requerida de este componente
                    const snapshotComp = (
                        orderItem.bundleComponents || []
                    ).find(
                        (c: any) =>
                            c.productId.toString() ===
                            item.componentProductId?.toString(),
                    );

                    let requiredQty = snapshotComp
                        ? Number(snapshotComp.totalQuantity) ||
                          Number(orderItem.quantity) *
                              Number(snapshotComp.quantityPerBundle)
                        : 0;

                    if (!requiredQty) {
                        const parentProduct = await ProductModel.findById(
                            orderItem.productId,
                        )
                            .select("bundleItems")
                            .session(session)
                            .lean();
                        const bi = (parentProduct?.bundleItems || []).find(
                            (b: any) =>
                                b.productId.toString() ===
                                item.componentProductId?.toString(),
                        );
                        requiredQty =
                            Number(orderItem.quantity) *
                            Math.max(1, Number(bi?.quantity) || 1);
                    }

                    if (compProduct.hasSerialNumber) {
                        if (item.allocations.length !== requiredQty) {
                            throw new Error(
                                `Cantidad de seriales inválida para "${compProduct.name}" (requeridos: ${requiredQty})`,
                            );
                        }

                        const inventoryIds = item.allocations.map(
                            (a) => a.inventoryItemId,
                        );

                        const inventoryItems = await InventoryItemModel.find({
                            _id: { $in: inventoryIds },
                            productId: compProduct._id,
                            status: "available",
                        }).session(session);

                        if (inventoryItems.length !== requiredQty) {
                            throw new Error(
                                `Uno o más seriales seleccionados para "${compProduct.name}" ya no están disponibles`,
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
                    } else {
                        let totalAllocated = 0;

                        for (const allocation of item.allocations) {
                            if (allocation.quantity <= 0) continue;
                            totalAllocated += allocation.quantity;

                            const updated = await InventoryItemModel.updateOne(
                                {
                                    _id: allocation.inventoryItemId,
                                    productId: compProduct._id,
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
                                    `Stock insuficiente en el lote para "${compProduct.name}"`,
                                );
                            }
                        }

                        if (totalAllocated !== requiredQty) {
                            throw new Error(
                                `Cantidad asignada inválida para "${compProduct.name}" (requeridos: ${requiredQty}, asignados: ${totalAllocated})`,
                            );
                        }
                    }

                    for (const a of item.allocations) {
                        if (a.quantity <= 0) continue;
                        orderItem.allocations.push({
                            inventoryItemId: a.inventoryItemId,
                            quantity: a.quantity,
                            componentProductId: compProduct._id,
                            componentName: compProduct.name,
                        });
                    }

                    const updatedComp = await ProductModel.updateOne(
                        {
                            _id: compProduct._id,
                            reservedStock: { $gte: requiredQty },
                            totalStock: { $gte: requiredQty },
                        },
                        {
                            $inc: {
                                reservedStock: -requiredQty,
                                totalStock: -requiredQty,
                            },
                        },
                        { session },
                    );

                    if (updatedComp.modifiedCount === 0) {
                        throw new Error(
                            `Stock reservado inconsistente en "${compProduct.name}"`,
                        );
                    }

                    continue;
                }

                // =====================================
                // PRODUCTO SIMPLE (Flujo tradicional)
                // =====================================
                const product = await ProductModel.findById(
                    item.productId,
                ).session(session);

                if (!product) {
                    throw new Error("Producto no encontrado");
                }

                const isPreAllocated =
                    orderItem.allocations && orderItem.allocations.length > 0;

                if (!isPreAllocated) {
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
                    } else {
                        let totalAllocated = 0;

                        for (const allocation of item.allocations) {
                            if (allocation.quantity <= 0) continue;
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

                    orderItem.allocations = item.allocations.filter(
                        (a) => a.quantity > 0,
                    );
                } else {
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

            order.inventoryAllocatedAt = new Date();
            order.markModified("items");

            await order.save({ session });
        });
    } finally {
        session.endSession();
    }
}
