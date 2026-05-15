import { Schema } from "mongoose";
import { OrderItemAllocationSchema } from "./OrderItemAllocation";

export const OrderItemSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        name: { type: String, required: true },

        quantity: { type: Number, required: true, min: 1 },

        unitPrice: { type: Number, required: true, min: 0 },

        subtotal: { type: Number, required: true, min: 0 },

        taxRate: { type: Number, required: true, default: 10.5 }, // IVA ventas

        total: { type: Number, required: true, min: 0 },

        allocations: {
            type: [OrderItemAllocationSchema],
            default: [],
        },
    },
    { _id: false },
);
