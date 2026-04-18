import { Schema, model, models } from "mongoose";

export const OrderSchema = new Schema(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            index: true,
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
            firstName: String,
            lastName: String,
            address1: String,
            city: String,
            state: String,
            postcode: String,
            phone: String,
            country: { type: String, default: "AR" },
            tipoDocumento: String,
            numeroDocumento: String,
        },
        shipping: {
            firstName: String,
            lastName: String,
            address1: String,
            city: String,
            state: String,
            postcode: String,
            country: { type: String, default: "AR" },
        },
        lineItems: [
            {
                productId: { type: String, required: true },
                name: { type: String, required: true },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                total: { type: Number, required: true },
            },
        ],
        paymentMethod: {
            type: String,
            enum: ["mercadopago", "bacs", "cod"],
            required: true,
        },
        paymentMethodTitle: String,
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
    },
    { timestamps: true },
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ customerEmail: 1 });

export const OrderModel = models.Order || model("Order", OrderSchema);
