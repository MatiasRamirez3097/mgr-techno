// lib/inventory/getAllocationSuggestions.ts

import { OrderModel } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";

export async function getAllocationSuggestions(orderId: string) {
    const order = await OrderModel.findById(orderId).lean();

    if (!order) {
        throw new Error("Orden no encontrada");
    }

    const results = await Promise.all(
        order.items.map(async (item: any) => {
            const product = await ProductModel.findById(item.productId).lean();

            if (!product) {
                throw new Error("Producto no encontrado");
            }

            // ============================================
            // PRODUCTOS SERIALIZADOS
            // ============================================

            if (product.hasSerialNumber) {
                const inventoryItems = await InventoryItemModel.find({
                    productId: item.productId,
                    status: "available",
                })
                    .sort({ createdAt: 1 })
                    .limit(item.quantity)
                    .lean();

                return {
                    productId: item.productId.toString(),
                    productName: item.name,
                    quantity: item.quantity,

                    isSerialized: true,

                    hasInsufficientInventory:
                        inventoryItems.length < item.quantity,

                    suggestions: inventoryItems.map((inv: any) => ({
                        inventoryItemId: inv._id.toString(),
                        serialNumber: inv.serialNumber,
                        quantity: 1,
                        createdAt: inv.createdAt,
                    })),
                };
            }

            // ============================================
            // PRODUCTOS NO SERIALIZADOS
            // ============================================

            const lots = await InventoryItemModel.find({
                productId: item.productId,
                remainingQuantity: { $gt: 0 },
            })
                .sort({ createdAt: 1 })
                .lean();

            let remaining = item.quantity;

            const suggestions = [];

            for (const lot of lots) {
                if (remaining <= 0) break;

                const available = lot.remainingQuantity;

                if (available <= 0) continue;

                const qty = Math.min(available, remaining);

                suggestions.push({
                    inventoryItemId: lot._id.toString(),
                    quantity: qty,
                    availableQuantity: available,
                    createdAt: lot.createdAt,
                });

                remaining -= qty;
            }

            return {
                productId: item.productId.toString(),
                productName: item.name,
                quantity: item.quantity,

                isSerialized: false,

                hasInsufficientInventory: remaining > 0,

                suggestions,
            };
        }),
    );

    return results;
}
