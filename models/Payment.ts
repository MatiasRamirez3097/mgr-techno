import { Schema } from "mongoose";

export const PaymentSchema = new Schema(
    {
        method: {
            type: String,
            enum: [
                "cash",
                "bank_transfer",
                "debit_card",
                "credit_card",
                "mercadopago",
                "other",
            ],
            required: true,
        },

        status: {
            type: String,
            enum: ["pending", "paid", "failed", "refunded"],
            default: "paid",
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        reference: {
            type: String,
        },

        paidAt: {
            type: Date,
            default: Date.now,
        },

        notes: {
            type: String,
        },
    },
    { _id: true },
);
