// /models/SaleItem.ts

import { Schema, model, models } from "mongoose";

export const SaleItemSchema = new Schema({
    saleId: {
        type: Schema.Types.ObjectId,
        ref: "Sale",
        required: true,
        index: true,
    },

    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },

    quantity: {
        type: Number,
        required: true,
    },

    price: {
        type: Number,
        required: true,
    },

    // 🔥 clave para trazabilidad
    inventoryItemIds: [
        {
            type: Schema.Types.ObjectId,
            ref: "InventoryItem",
        },
    ],
});

export const SaleItemModel =
    models.SaleItem || model("SaleItem", SaleItemSchema);
