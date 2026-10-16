import { ClientSession } from "mongoose";

import { InventoryItemModel, OrderModel, ProductModel } from "@/models";
import { recalculateBundlesForProducts } from "@/lib/products/recalculateBundlesStock";

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

    const affectedProductIds = new Set<string>();

    for (const item of order.items as any[]) {
        const product = await ProductModel.findById(item.productId).session(
            session,
        );

        if (!product) {
            throw new Error("Producto no encontrado");
        }

        const isBundle = item.isBundle || product.type === "bundle";

        if (isBundle) {
            for (const allocation of item.allocations || []) {
                const invItem = await InventoryItemModel.findById(
                    allocation.inventoryItemId,
                ).session(session);

                if (!invItem) {
                    throw new Error(
                        `Ítem de inventario no encontrado al revertir combo "${item.name}"`,
                    );
                }

                const compProductId =
                    allocation.componentProductId || invItem.productId;
                const compProduct =
                    await ProductModel.findById(compProductId).session(session);

                if (compProduct?.hasSerialNumber || invItem.serialNumber) {
                    await InventoryItemModel.updateOne(
                        { _id: invItem._id },
                        {
                            $set: {
                                status: "available",
                                saleId: null,
                            },
                        },
                        { session },
                    );
                } else {
                    await InventoryItemModel.updateOne(
                        { _id: invItem._id },
                        {
                            $inc: {
                                remainingQuantity: allocation.quantity,
                            },
                        },
                        { session },
                    );
                }

                await ProductModel.updateOne(
                    { _id: compProductId },
                    {
                        $inc: {
                            totalStock: allocation.quantity,
                            availableStock: allocation.quantity,
                        },
                        $set: {
                            isAvailable: true,
                        },
                    },
                    { session },
                );

                affectedProductIds.add(compProductId.toString());
            }
            continue;
        }

        // =====================================
        // PRODUCTOS SIMPLES
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
        } else {
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

        const updatedProduct = await ProductModel.updateOne(
            {
                _id: product._id,
            },
            {
                $inc: {
                    totalStock: item.quantity,
                    availableStock: item.quantity,
                },
                $set: {
                    isAvailable: true,
                },
            },
            { session },
        );

        if (updatedProduct.modifiedCount === 0) {
            throw new Error(`Error actualizando stock de ${product.name}`);
        }

        affectedProductIds.add(product._id.toString());
    }

    if (affectedProductIds.size > 0) {
        await recalculateBundlesForProducts(
            Array.from(affectedProductIds),
            session,
        );
    }

    order.inventoryAllocatedAt = null;

    await order.save({ session });
}

