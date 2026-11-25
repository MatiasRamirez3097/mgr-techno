import type { Types } from "mongoose";
import { OrderModel } from "@/models/Order";
import { PendingSaleModel } from "@/models/PendingSale";

// Pedidos que cuentan como venta: no anulados y, si vienen de la tienda, cobrados
// (un pedido web sin pagar puede no concretarse nunca).
export const SOLD_ORDER_MATCH = {
    status: { $nin: ["cancelled", "refunded", "failed"] },
    $or: [{ source: "admin" }, { paymentStatus: { $in: ["paid", "partial"] } }],
};

interface SalesAgg {
    _id: Types.ObjectId;
    units: number;
    lastSaleAt: Date;
}

/**
 * Ventas por producto: ítems de pedidos (los combos suman a sus componentes) más las ventas
 * escaneadas que todavía no se formalizaron. Las unidades cuentan desde `windowStart`; la última
 * venta se busca desde `since` (más atrás), para saber hace cuánto no se vende algo.
 */
export async function getSalesByProduct(
    since: Date,
    windowStart: Date,
): Promise<Map<string, { units: number; lastSaleAt: Date }>> {
    const unitsInWindow = (qty: string) => ({ $sum: { $cond: [{ $gte: ["$createdAt", windowStart] }, qty, 0] } });
    const [orderSales, pendingSales] = await Promise.all([
        OrderModel.aggregate<SalesAgg>([
            { $match: { createdAt: { $gte: since }, ...SOLD_ORDER_MATCH } },
            { $unwind: "$items" },
            {
                $project: {
                    createdAt: 1,
                    lines: {
                        $cond: [
                            { $gt: [{ $size: { $ifNull: ["$items.bundleComponents", []] } }, 0] },
                            {
                                $map: {
                                    input: "$items.bundleComponents",
                                    as: "c",
                                    in: { productId: "$$c.productId", quantity: "$$c.totalQuantity" },
                                },
                            },
                            [{ productId: "$items.productId", quantity: "$items.quantity" }],
                        ],
                    },
                },
            },
            { $unwind: "$lines" },
            {
                $group: {
                    _id: "$lines.productId",
                    units: unitsInWindow("$lines.quantity"),
                    lastSaleAt: { $max: "$createdAt" },
                },
            },
        ]),
        PendingSaleModel.aggregate<SalesAgg>([
            { $match: { status: "pending", createdAt: { $gte: since } } },
            { $group: { _id: "$productId", units: unitsInWindow("$quantity"), lastSaleAt: { $max: "$createdAt" } } },
        ]),
    ]);

    const sales = new Map<string, { units: number; lastSaleAt: Date }>();
    for (const s of [...orderSales, ...pendingSales]) {
        const key = s._id.toString();
        const prev = sales.get(key);
        sales.set(key, {
            units: (prev?.units ?? 0) + s.units,
            lastSaleAt: prev && prev.lastSaleAt > s.lastSaleAt ? prev.lastSaleAt : s.lastSaleAt,
        });
    }
    return sales;
}
