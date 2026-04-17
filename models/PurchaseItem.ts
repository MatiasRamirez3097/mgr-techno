// /models/PurchaseItem.ts

import { Schema, model, models } from "mongoose";

export const PurchaseItemSchema = new Schema({
    purchaseId: {
        type: Schema.Types.ObjectId,
        ref: "Purchase",
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

    cost: {
        type: Number,
        required: true,
    },
});

export const PurchaseItemModel =
    models.PurchaseItem || model("PurchaseItem", PurchaseItemSchema);
