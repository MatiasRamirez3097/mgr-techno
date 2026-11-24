import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models";
import { getPendingSales } from "./getPendingSales";
import type { PendingSaleInboxItemDTO } from "@/types/shared/pendingSale";

const HISTORY_LIMIT = 50;

/**
 * Datos de la bandeja: ventas pendientes con el precio actual del producto (para proponerlo al
 * formalizar) y las últimas resueltas.
 */
export async function getPendingSalesInbox() {
    await connectDB();

    const [pending, converted, discarded] = await Promise.all([
        getPendingSales("pending", 500),
        getPendingSales("converted", HISTORY_LIMIT),
        getPendingSales("discarded", HISTORY_LIMIT),
    ]);

    const products = await ProductModel.find({ _id: { $in: pending.map((s) => s.productId) } })
        .select("effectivePrice")
        .lean<{ _id: { toString(): string }; effectivePrice?: number }[]>();
    const priceById = new Map(products.map((p) => [p._id.toString(), Number(p.effectivePrice) || 0]));

    const pendingWithPrice: PendingSaleInboxItemDTO[] = pending.map((sale) => ({
        ...sale,
        currentPrice: priceById.get(sale.productId) ?? 0,
    }));

    const history = [...converted, ...discarded]
        .sort((a, b) => (b.resolvedAt ?? b.createdAt).localeCompare(a.resolvedAt ?? a.createdAt))
        .slice(0, HISTORY_LIMIT);

    return { pending: pendingWithPrice, history };
}
