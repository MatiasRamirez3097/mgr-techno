import { Schema, model, models } from "mongoose";

/**
 * Conteo físico de un producto (conteo rotativo). Guarda cuánto debería haber al momento de
 * contar y de dónde salía ese número, cuánto se contó y cómo se resolvió la diferencia.
 */
const StockCountSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
        // Snapshot para mostrar aunque el producto cambie
        productName: { type: String, required: true },
        expected: {
            totalStock: { type: Number, required: true },
            pendingSalesUnits: { type: Number, default: 0 },
            deliveredUnallocatedUnits: { type: Number, default: 0 },
            allocatedUndeliveredUnits: { type: Number, default: 0 },
            expected: { type: Number, required: true },
        },
        counted: { type: Number, required: true, min: 0 },
        difference: { type: Number, required: true },
        status: {
            type: String,
            enum: ["matched", "difference", "adjusted", "pending_sale", "dismissed", "superseded"],
            required: true,
            index: true,
        },
        reason: { type: String, enum: ["damaged", "lost", "data_error", "found", "other", null], default: null },
        notes: { type: String, default: "" },
        countedBy: { type: String, default: "" },
        resolvedBy: { type: String, default: "" },
        resolvedAt: { type: Date, default: null },
        writeOffCost: { type: Number, default: null },
        // Lote creado al sumar unidades que sobraban
        inventoryItemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", default: null },
        pendingSaleId: { type: Schema.Types.ObjectId, ref: "PendingSale", default: null },
    },
    { timestamps: true },
);

StockCountSchema.index({ productId: 1, createdAt: -1 });
StockCountSchema.index({ createdAt: -1 });

export const StockCountModel = models.StockCount || model("StockCount", StockCountSchema, "stock_counts");
