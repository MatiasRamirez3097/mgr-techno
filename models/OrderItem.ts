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

        isBundle: {
            type: Boolean,
            default: false,
        },

        bundleComponents: {
            type: [
                {
                    productId: {
                        type: Schema.Types.ObjectId,
                        ref: "Product",
                        required: true,
                    },
                    name: { type: String, required: true },
                    quantityPerBundle: { type: Number, required: true, min: 1 },
                    totalQuantity: { type: Number, required: true, min: 1 },
                    _id: false,
                },
            ],
            default: [],
        },

        allocations: {
            type: [OrderItemAllocationSchema],
            default: [],
        },
    },
    { _id: false },
);
