import { Schema, model, models } from "mongoose";
import { OrderItemSchema } from "./OrderItem";
import { AddressSchema } from "./common/Address";
import { BillingSchema } from "./common/Billing";

export const OrderSchema = new Schema(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            index: true,
            required: true,
        },
        customerEmail: { type: String, required: true },
        status: {
            type: String,
            enum: [
                "pending",
                "processing",
                "on_hold",
                "completed",
                "cancelled",
                "refunded",
                "failed",
            ],
            default: "pending",
            index: true,
        },
        billing: {
            type: BillingSchema,
        },
        shipping: {
            type: AddressSchema,
        },
        items: {
            type: [OrderItemSchema],
            default: [],
        },
        paymentMethod: {
            type: String,
            enum: ["mercadopago", "bacs", "cod"],
            required: true,
        },
        paymentMethodTitle: String,
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "pending",
            index: true,
        },
        shippingMethod: {
            type: String,
            enum: ["local_pickup", "andreani"],
            required: true,
        },
        shippingCost: { type: Number, default: 0 },
        subtotal: { type: Number, required: true },
        total: { type: Number, required: true },
        datePaid: { type: Date, default: null },
        notes: { type: String, required: false },
        inventoryAllocatedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customerEmail: 1 });

export const OrderModel = models.Order || model("Order", OrderSchema);
