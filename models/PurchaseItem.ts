// /models/purchase/PurchaseItem.ts

import { Schema } from "mongoose";

export const PurchaseItemSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        cost: { type: Number, required: true, min: 0 },
        serialNumbers: [{ type: String }],
    },
    { _id: false },
);
