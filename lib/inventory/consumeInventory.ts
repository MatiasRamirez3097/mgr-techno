import { InventoryItemModel } from "@/models/InventoryItem";

export async function consumeInventory({
    productId,
    quantityNeeded,
    session,
}: {
    productId: string;
    quantityNeeded: number;
    session: any;
}) {
    let remaining = quantityNeeded;
    const usedItems = [];

    const inventoryItems = await InventoryItemModel.find({
        productId,
        status: "available",
    })
        .sort({ createdAt: 1 }) // FIFO
        .session(session);

    for (const item of inventoryItems) {
        if (remaining <= 0) break;

        // 🔴 SERIALIZADO
        if (item.serialNumber) {
            item.status = "sold";
            remaining -= 1;

            await item.save({ session });

            usedItems.push({
                inventoryItemId: item._id,
                quantity: 1,
            });

            continue;
        }

        // 🟢 NO SERIALIZADO (lote)
        const available = item.remainingQuantity;

        if (available <= 0) continue;

        const toConsume = Math.min(available, remaining);

        item.remainingQuantity -= toConsume;

        if (item.remainingQuantity === 0) {
            item.status = "sold";
        }

        await item.save({ session });

        usedItems.push({
            inventoryItemId: item._id,
            quantity: toConsume,
        });

        remaining -= toConsume;
    }

    if (remaining > 0) {
        throw new Error("Stock insuficiente");
    }

    return usedItems;
}
