import type { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { StockCountModel } from "@/models/StockCount";
import { CUSTOM_PC_SYSTEM_SLUG } from "@/services/products/ensureCustomPcProduct";
import { getSalesByProduct } from "@/services/inventory/getSalesByProduct";
import { describeCountReasons, pickCountQueue } from "@/lib/inventory/stockCount";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import type { StockCountQueueItem, StockCountSettingsDTO } from "@/types/shared/stockCount";

const DAY_MS = 24 * 60 * 60 * 1000;
const SALES_DAYS = 90;

/** Inicio del día de hoy en Argentina (UTC−3 todo el año) */
export function startOfStoreDay(now: Date): Date {
    return new Date(`${todayInStoreTimeZone(now)}T00:00:00-03:00`);
}

// Productos que se cuentan: con stock, que manejan stock y sin número de serie (esos se
// controlan por serial). Sin combos (stock virtual) ni la "PC armada".
export const COUNTABLE_PRODUCT_FILTER = {
    type: { $ne: "bundle" },
    slug: { $ne: CUSTOM_PC_SYSTEM_SLUG },
    manageStock: { $ne: false },
    hasSerialNumber: { $ne: true },
};

/** Productos distintos contados hoy (un reconteo no suma otro) */
export async function countProductsCountedToday(now: Date): Promise<number> {
    const ids = await StockCountModel.distinct("productId", { createdAt: { $gte: startOfStoreDay(now) } });
    return ids.length;
}

/**
 * Lista para contar hoy: lo que falta para llegar a los productos por día (más `extra` si se pide
 * seguir), por prioridad: más tiempo sin contar y más ventas primero.
 */
export async function getStockCountQueue(
    settings: StockCountSettingsDTO,
    { now = new Date(), extra = 0 }: { now?: Date; extra?: number } = {},
): Promise<{ queue: StockCountQueueItem[]; countedToday: number }> {
    await connectDB();
    const since = new Date(now.getTime() - SALES_DAYS * DAY_MS);
    const [products, lastCounts, sales, countedToday] = await Promise.all([
        ProductModel.find(
            { ...COUNTABLE_PRODUCT_FILTER, totalStock: { $gt: 0 } },
            { name: 1, sku: 1, image: 1 },
        ).lean<{ _id: Types.ObjectId; name: string; sku?: string; image?: string }[]>(),
        StockCountModel.aggregate<{ _id: Types.ObjectId; last: Date }>([
            { $group: { _id: "$productId", last: { $max: "$createdAt" } } },
        ]),
        getSalesByProduct(since, since),
        countProductsCountedToday(now),
    ]);

    const last = new Map(lastCounts.map((c) => [c._id.toString(), new Date(c.last)]));
    const candidates = products.map((p) => {
        const productId = p._id.toString();
        return {
            productId,
            product: p,
            lastCountedAt: last.get(productId) ?? null,
            unitsSold: sales.get(productId)?.units ?? 0,
        };
    });

    const limit = Math.max(0, settings.stockCountDailyProducts - countedToday) + Math.max(0, extra);
    const picked = pickCountQueue(candidates, { limit, repeatDays: settings.stockCountRepeatDays, now });

    return {
        countedToday,
        queue: picked.map((c) => ({
            productId: c.productId,
            name: c.product.name,
            sku: c.product.sku || "",
            image: c.product.image || null,
            lastCountedAt: c.lastCountedAt ? c.lastCountedAt.toISOString() : null,
            unitsSold: c.unitsSold,
            why: describeCountReasons(c, now),
        })),
    };
}
