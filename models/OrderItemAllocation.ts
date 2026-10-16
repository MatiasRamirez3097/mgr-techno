import { Schema } from "mongoose";

export const OrderItemAllocationSchema = new Schema(
    {
        inventoryItemId: {
            type: Schema.Types.ObjectId,
            ref: "InventoryItem",
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        componentProductId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
        },

        componentName: {
            type: String,
        },
    },
    { _id: false },
);
