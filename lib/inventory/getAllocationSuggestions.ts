import { OrderModel, ProductModel, InventoryItemModel } from "@/models";

async function buildProductSuggestion(
    targetProduct: any,
    requiredQuantity: number,
    orderProductId: string,
    orderItemIndex: number,
    usedSerialIds: Set<string>,
    usedLotQuantities: Map<string, number>,
    bundleMeta?: {
        componentProductId: string;
        parentBundleName: string;
    },
) {
    const allocationKey = bundleMeta
        ? `${orderItemIndex}::${orderProductId}::${bundleMeta.componentProductId}`
        : `${orderItemIndex}::${orderProductId}`;

    if (targetProduct.hasSerialNumber) {
        const inventoryItems = await InventoryItemModel.find({
            productId: targetProduct._id,
            status: "available",
        })
            .sort({ createdAt: 1 })
            .lean();

        const suggestions = inventoryItems.map((inv: any) => ({
            inventoryItemId: inv._id.toString(),
            serialNumber: inv.serialNumber,
            quantity: 1,
            createdAt: inv.createdAt,
        }));

        // Sugerir inicialmente seriales que no hayan sido pre-sugeridos en otro ítem de la misma orden
        const initialSelectedIds: string[] = [];
        for (const s of suggestions) {
            if (initialSelectedIds.length >= requiredQuantity) break;
            if (!usedSerialIds.has(s.inventoryItemId)) {
                initialSelectedIds.push(s.inventoryItemId);
                usedSerialIds.add(s.inventoryItemId);
            }
        }

        return {
            allocationKey,
            orderItemIndex,
            productId: orderProductId,
            componentProductId: bundleMeta?.componentProductId,
            parentBundleName: bundleMeta?.parentBundleName,
            productName: targetProduct.name,
            quantity: requiredQuantity,
            isSerialized: true,
            hasInsufficientInventory: inventoryItems.length < requiredQuantity,
            initialSelectedIds,
            suggestions,
        };
    }

    const lots = await InventoryItemModel.find({
        productId: targetProduct._id,
        remainingQuantity: { $gt: 0 },
    })
        .sort({ createdAt: 1 })
        .lean();

    let remaining = requiredQuantity;
    const suggestions = [];

    for (const lot of lots) {
        if (remaining <= 0) break;

        const lotIdStr = lot._id.toString();
        const alreadyUsed = usedLotQuantities.get(lotIdStr) || 0;
        const available = Math.max(0, lot.remainingQuantity - alreadyUsed);

        if (available <= 0) continue;

        const qty = Math.min(available, remaining);

        suggestions.push({
            inventoryItemId: lotIdStr,
            quantity: qty,
            availableQuantity: lot.remainingQuantity,
            createdAt: lot.createdAt,
        });

        usedLotQuantities.set(lotIdStr, alreadyUsed + qty);
        remaining -= qty;
    }

    return {
        allocationKey,
        orderItemIndex,
        productId: orderProductId,
        componentProductId: bundleMeta?.componentProductId,
        parentBundleName: bundleMeta?.parentBundleName,
        productName: targetProduct.name,
        quantity: requiredQuantity,
        isSerialized: false,
        hasInsufficientInventory: remaining > 0,
        suggestions,
    };
}

export async function getAllocationSuggestions(orderId: string) {
    const order = await OrderModel.findById(orderId).lean();

    if (!order) {
        throw new Error("Orden no encontrada");
    }

    const usedSerialIds = new Set<string>();
    const usedLotQuantities = new Map<string, number>();
    const results: any[] = [];

    const orderItems = (order.items as any[]) || [];

    for (let idx = 0; idx < orderItems.length; idx++) {
        const item = orderItems[idx];
        const product = await ProductModel.findById(item.productId).lean();

        if (!product) {
            throw new Error("Producto no encontrado");
        }

        const isBundle =
            item.isBundle ||
            (product.type === "bundle" &&
                Array.isArray(product.bundleItems) &&
                product.bundleItems.length > 0);

        if (isBundle) {
            const rawComponents =
                item.bundleComponents && item.bundleComponents.length > 0
                    ? item.bundleComponents.map((c: any) => ({
                          productId: c.productId,
                          quantityPerBundle: c.quantityPerBundle,
                      }))
                    : (product.bundleItems || []).map((bi: any) => ({
                          productId: bi.productId,
                          quantityPerBundle: bi.quantity,
                      }));

            for (const comp of rawComponents) {
                const compProduct = await ProductModel.findById(
                    comp.productId,
                ).lean();
                if (!compProduct) {
                    throw new Error(
                        `Producto componente no encontrado en "${item.name}"`,
                    );
                }

                const requiredQty =
                    Number(item.quantity) *
                    Math.max(1, Number(comp.quantityPerBundle) || 1);

                const sug = await buildProductSuggestion(
                    compProduct,
                    requiredQty,
                    item.productId.toString(),
                    idx,
                    usedSerialIds,
                    usedLotQuantities,
                    {
                        componentProductId: compProduct._id.toString(),
                        parentBundleName: item.name,
                    },
                );
                results.push(sug);
            }
        } else {
            const sug = await buildProductSuggestion(
                product,
                Number(item.quantity),
                item.productId.toString(),
                idx,
                usedSerialIds,
                usedLotQuantities,
            );
            results.push(sug);
        }
    }

    return results;
}
