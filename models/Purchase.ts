import { Schema, model, models } from "mongoose";

export const PurchaseSchema = new Schema(
    {
        supplierId: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["draft", "confirmed", "received", "cancelled"],
            default: "draft",
            index: true,
        },

        total: {
            type: Number,
            required: true,
            default: 0,
        },

        notes: String,

        receivedAt: Date,
    },
    { timestamps: true },
);

export const PurchaseModel =
    models.Purchase || model("Purchase", PurchaseSchema);
