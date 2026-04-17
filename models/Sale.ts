// /models/Sale.ts

import { Schema, model, models } from "mongoose";

export const SaleSchema = new Schema(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: false, // puede ser consumidor final
            index: true,
        },

        status: {
            type: String,
            enum: ["pending", "paid", "shipped", "completed", "cancelled"],
            default: "pending",
            index: true,
        },

        total: {
            type: Number,
            required: true,
            default: 0,
        },

        currency: {
            type: String,
            default: "ARS",
        },

        notes: String,
    },
    { timestamps: true },
);

export const SaleModel = models.Sale || model("Sale", SaleSchema);
