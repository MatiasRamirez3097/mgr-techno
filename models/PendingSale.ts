import { Schema, model, models } from "mongoose";

/**
 * Venta escaneada con el celular que todavía no se cargó como pedido. Reserva stock al crearse
 * (available−, reserved+); al descartarla se libera y al formalizarla pasa a un pedido.
 */
const PendingSaleSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
        // Snapshot para mostrar aunque el producto cambie de nombre
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        // Código leído (vacío si se eligió el producto a mano)
        scannedCode: { type: String, default: "" },
        status: {
            type: String,
            enum: ["pending", "converted", "discarded"],
            default: "pending",
            index: true,
        },
        notes: { type: String, default: "" },
        createdBy: { type: String, default: "" },
        resolvedBy: { type: String, default: "" },
        resolvedAt: { type: Date, default: null },
        orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    },
    { timestamps: true },
);

PendingSaleSchema.index({ status: 1, createdAt: -1 });

export const PendingSaleModel =
    models.PendingSale || model("PendingSale", PendingSaleSchema, "pending_sales");
