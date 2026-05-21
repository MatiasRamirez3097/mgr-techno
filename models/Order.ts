import { Schema, model, models } from "mongoose";
import { OrderItemSchema } from "./OrderItem";
import { AddressSchema } from "./common/Address";
import { BillingSchema } from "./common/Billing";
import { PaymentSchema } from "./Payment";

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
        paymentStatus: {
            type: String,
            enum: ["pending", "partial", "paid", "failed", "refunded"],
            default: "pending",
            index: true,
        },
        payments: {
            type: [PaymentSchema],
            default: [],
        },
        shippingMethod: {
            type: {
                method: {
                    type: String,
                    enum: ["local_pickup", "andreani"],
                    required: true,
                },

                cost: {
                    type: Number,
                    default: 0,
                },
            },
            required: true,
        },
        source: {
            type: String,
            enum: ["ecommerce", "admin"],
            required: true,
        },
        subtotal: { type: Number, required: true },
        total: { type: Number, required: true },
        datePaid: { type: Date, default: null },
        notes: { type: String, required: false },
        inventoryAllocatedAt: {
            type: Date,
            default: null,
        },
        receipt: {
            generatedAt: { type: Date, required: true },
            url: { type: String, required: true },
            publicId: { type: String, required: true },
            receiptPdfPublicId: { type: String, required: true },
        },
    },
    { timestamps: true },
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customerEmail: 1 });

export const OrderModel = models.Order || model("Order", OrderSchema);
