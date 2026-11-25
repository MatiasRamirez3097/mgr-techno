import mongoose, { type ClientSession, type Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { ProductModel } from "@/models/Product";
import { InventoryItemModel } from "@/models/InventoryItem";
import { StockCountModel } from "@/models/StockCount";
import { resolveStockCountSchema } from "@/lib/validators/stockCountSchema";
import { mapStockCountToDTO, type StockCountDoc } from "@/lib/mappers/stockCountMapper";
import { MISSING_REASONS, SURPLUS_REASONS, takeFromLots } from "@/lib/inventory/stockCount";
import { updateProductStock } from "@/services/products/updateProductStock";
import { createPendingSale } from "@/services/pendingSales/createPendingSale";
import type { StockCountDTO, StockCountReason } from "@/types/shared/stockCount";

interface LotLean {
    _id: Types.ObjectId;
    remainingQuantity: number;
    unitCost?: number | null;
}

const productInfo = (productId: Types.ObjectId) =>
    ProductModel.findById(productId, { sku: 1, image: 1 }).lean<{ sku?: string; image?: string }>();

/** Da de baja unidades que faltan: baja el stock y descuenta de los lotes más viejos. */
async function writeOff(productId: string, quantity: number, session: ClientSession): Promise<number | null> {
    // Valida que alcance lo disponible (lo reservado es de pedidos o ventas escaneadas)
    await updateProductStock(productId, -quantity, 0, session);
    await ProductModel.updateOne({ _id: productId }, { $inc: { totalStock: -quantity } }, { session });

    const lots = await InventoryItemModel.find(
        { productId, remainingQuantity: { $gt: 0 } },
        { remainingQuantity: 1, unitCost: 1 },
    )
        .sort({ createdAt: 1 })
        .session(session)
        .lean<LotLean[]>();
    const { takes, cost } = takeFromLots(
        lots.map((l) => ({ id: l._id.toString(), remainingQuantity: l.remainingQuantity, unitCost: l.unitCost ?? null })),
        quantity,
    );
    for (const take of takes) {
        await InventoryItemModel.updateOne({ _id: take.id }, { $inc: { remainingQuantity: -take.quantity } }, { session });
    }
    return cost;
}

/** Suma unidades que sobraban, en un lote nuevo con el costo del último lote conocido. */
async function addFound(productId: string, quantity: number, session: ClientSession): Promise<Types.ObjectId> {
    await updateProductStock(productId, quantity, 0, session);
    await ProductModel.updateOne({ _id: productId }, { $inc: { totalStock: quantity } }, { session });

    const lastCosted = await InventoryItemModel.findOne(
        { productId, unitCost: { $gt: 0 } },
        { unitCost: 1 },
    )
        .sort({ createdAt: -1 })
        .session(session)
        .lean<{ unitCost?: number }>();
    const [lot] = await InventoryItemModel.create(
        [
            {
                productId,
                quantity,
                remainingQuantity: quantity,
                status: "available",
                location: "main",
                ...(lastCosted?.unitCost ? { unitCost: lastCosted.unitCost } : {}),
            },
        ],
        { session },
    );
    return lot._id;
}

/**
 * Resuelve la diferencia de un conteo:
 * - adjust: corrige el stock en la diferencia contada (baja o suma unidades), con un motivo.
 * - pending_sale: el faltante fue una venta sin registrar; queda como venta escaneada pendiente
 *   para formalizarla desde la bandeja.
 * - dismiss: no se toca el stock (se contó mal).
 */
export async function resolveStockCount(id: string, data: unknown, resolvedBy: string): Promise<StockCountDTO> {
    const parsed = resolveStockCountSchema.safeParse(data);
    if (!parsed.success) {
        throw new BusinessError(parsed.error.issues[0]?.message || "Datos inválidos", 400);
    }
    const { action, reason, notes } = parsed.data;
    if (!mongoose.isValidObjectId(id)) throw new BusinessError("Conteo no encontrado", 404);

    await connectDB();
    const count = await StockCountModel.findById(id).lean<StockCountDoc>();
    if (!count) throw new BusinessError("Conteo no encontrado", 404);
    if (count.status !== "difference") throw new BusinessError("Este conteo ya está resuelto", 409);

    const missing = -count.difference;
    const productId = count.productId.toString();
    const appendNotes = [count.notes, notes].filter(Boolean).join(" · ");

    if (action === "dismiss") {
        const doc = await StockCountModel.findOneAndUpdate(
            { _id: id, status: "difference" },
            { $set: { status: "dismissed", notes: appendNotes, resolvedBy, resolvedAt: new Date() } },
            { returnDocument: "after" },
        ).lean<StockCountDoc>();
        if (!doc) throw new BusinessError("Este conteo ya está resuelto", 409);
        return mapStockCountToDTO(doc, await productInfo(doc.productId));
    }

    if (action === "pending_sale") {
        if (missing <= 0) throw new BusinessError("Sólo un faltante puede ser una venta sin registrar", 400);
        // Se toma el conteo antes de crear la venta, para que dos clics no creen dos ventas
        const claimed = await StockCountModel.findOneAndUpdate(
            { _id: id, status: "difference" },
            { $set: { status: "pending_sale", resolvedBy, resolvedAt: new Date() } },
        );
        if (!claimed) throw new BusinessError("Este conteo ya está resuelto", 409);
        try {
            const date = new Date(count.createdAt).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
            const sale = await createPendingSale(
                {
                    productId,
                    quantity: missing,
                    scannedCode: "",
                    notes: [`Faltante del conteo del ${date}`, notes].filter(Boolean).join(" · ").slice(0, 500),
                },
                resolvedBy,
            );
            const doc = await StockCountModel.findByIdAndUpdate(
                id,
                { $set: { pendingSaleId: sale.id, notes: appendNotes } },
                { returnDocument: "after" },
            ).lean<StockCountDoc>();
            return mapStockCountToDTO(doc!, await productInfo(doc!.productId));
        } catch (error) {
            await StockCountModel.updateOne(
                { _id: id, status: "pending_sale" },
                { $set: { status: "difference", resolvedBy: "", resolvedAt: null } },
            );
            throw error;
        }
    }

    // adjust
    const allowed: StockCountReason[] = missing > 0 ? MISSING_REASONS : SURPLUS_REASONS;
    if (!reason || !allowed.includes(reason)) throw new BusinessError("Ese motivo no corresponde a la diferencia", 400);

    const session = await mongoose.startSession();
    try {
        let result: StockCountDoc | null = null;
        await session.withTransaction(async () => {
            const claimed = await StockCountModel.findOneAndUpdate(
                { _id: id, status: "difference" },
                { $set: { status: "adjusted" } },
                { session },
            );
            if (!claimed) throw new BusinessError("Este conteo ya está resuelto", 409);

            const update: Record<string, unknown> = { reason, notes: appendNotes, resolvedBy, resolvedAt: new Date() };
            if (missing > 0) update.writeOffCost = await writeOff(productId, missing, session);
            else update.inventoryItemId = await addFound(productId, -missing, session);

            result = await StockCountModel.findByIdAndUpdate(id, { $set: update }, { session, returnDocument: "after" })
                .lean<StockCountDoc>();
        });
        const doc = result as StockCountDoc | null;
        return mapStockCountToDTO(doc!, await productInfo(doc!.productId));
    } finally {
        await session.endSession();
    }
}
