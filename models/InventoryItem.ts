import { Schema, model, models } from "mongoose";

export const InventoryItemSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            index: true,
            required: true,
        },
        serialNumber: {
            type: String,
            index: true,
            sparse: true,
            unique: true,
        },
        status: {
            type: String,
            enum: ["available", "reserved", "sold", "defective"],
            default: "available",
            index: true,
        },
        purchaseId: {
            type: Schema.Types.ObjectId,
            ref: "Purchase",
            required: false,
        },
        saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: false },
        location: {
            type: String,
            default: "main",
        },
    },
    { timestamps: true },
);

//InventoryItemSchema.index({ productId: 1, status: 1 });
export const InventoryItemModel =
    models.InventoryItem || model("InventoryItem", InventoryItemSchema);
