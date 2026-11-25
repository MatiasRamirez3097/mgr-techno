import { Types, type ClientSession } from "mongoose";
import { ProductModel } from "@/models/Product";
import { OrderModel } from "@/models/Order";
import { PendingSaleModel } from "@/models/PendingSale";
import { computeExpectedStock } from "@/lib/inventory/stockCount";
import type { ExpectedStock } from "@/types/shared/stockCount";

// Pedidos que ya salieron del local / que todavía no
const DELIVERED_STATUSES = ["shipped", "completed"];
const UNDELIVERED_STATUSES = ["pending", "processing", "on_hold", "ready_for_pickup"];

interface OrderLean {
    status: string;
    inventoryAllocatedAt?: Date | null;
    items: {
        productId: Types.ObjectId;
        quantity: number;
        bundleComponents?: { productId: Types.ObjectId; totalQuantity: number }[];
    }[];
}

/** Unidades de cada producto en un pedido (los combos cuentan por sus componentes) */
function unitsByProduct(order: OrderLean): Map<string, number> {
    const units = new Map<string, number>();
    const add = (id: Types.ObjectId, qty: number) => units.set(id.toString(), (units.get(id.toString()) ?? 0) + qty);
    for (const item of order.items ?? []) {
        if (item.bundleComponents?.length) item.bundleComponents.forEach((c) => add(c.productId, c.totalQuantity));
        else add(item.productId, item.quantity);
    }
    return units;
}

/** Cuánto debería haber físicamente de cada producto en el local (ver computeExpectedStock). */
export async function getExpectedStock(
    productIds: string[],
    session?: ClientSession,
): Promise<Map<string, ExpectedStock>> {
    const ids = productIds.map((id) => new Types.ObjectId(id));
    const [products, pendingSales, orders] = await Promise.all([
        ProductModel.find({ _id: { $in: ids } }, { totalStock: 1 })
            .session(session ?? null)
            .lean<{ _id: Types.ObjectId; totalStock?: number }[]>(),
        PendingSaleModel.aggregate<{ _id: Types.ObjectId; units: number }>([
            { $match: { status: "pending", productId: { $in: ids } } },
            { $group: { _id: "$productId", units: { $sum: "$quantity" } } },
        ]).session(session ?? null),
        OrderModel.find(
            {
                $or: [
                    { status: { $in: DELIVERED_STATUSES }, inventoryAllocatedAt: null },
                    { status: { $in: UNDELIVERED_STATUSES }, inventoryAllocatedAt: { $ne: null } },
                ],
                $and: [{ $or: [{ "items.productId": { $in: ids } }, { "items.bundleComponents.productId": { $in: ids } }] }],
            },
            { status: 1, inventoryAllocatedAt: 1, "items.productId": 1, "items.quantity": 1, "items.bundleComponents": 1 },
        )
            .session(session ?? null)
            .lean<OrderLean[]>(),
    ]);

    const pending = new Map(pendingSales.map((p) => [p._id.toString(), p.units]));
    const delivered = new Map<string, number>();
    const undelivered = new Map<string, number>();
    for (const order of orders) {
        const target = order.inventoryAllocatedAt ? undelivered : delivered;
        for (const [id, qty] of unitsByProduct(order)) target.set(id, (target.get(id) ?? 0) + qty);
    }

    return new Map(
        products.map((p) => {
            const id = p._id.toString();
            return [
                id,
                computeExpectedStock({
                    totalStock: Math.max(0, p.totalStock ?? 0),
                    pendingSalesUnits: pending.get(id) ?? 0,
                    deliveredUnallocatedUnits: delivered.get(id) ?? 0,
                    allocatedUndeliveredUnits: undelivered.get(id) ?? 0,
                }),
            ];
        }),
    );
}
