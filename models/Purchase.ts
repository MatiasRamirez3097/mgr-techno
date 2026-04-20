// /models/purchase/Purchase.ts

import { Schema, model, models } from "mongoose";
import { PurchaseItemSchema } from "./PurchaseItem";
import { PurchaseDocumentSchema } from "./PurchaseDocument";

export const PurchaseSchema = new Schema(
    {
        supplierId: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            required: true,
            index: true,
        },

        supplierName: String,

        status: {
            type: String,
            enum: ["draft", "confirmed", "received", "cancelled"],
            default: "draft",
            index: true,
        },

        items: {
            type: [PurchaseItemSchema],
            default: [],
        },

        document: {
            type: PurchaseDocumentSchema,
            default: {},
        },

        subtotal: { type: Number, required: true, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 },

        notes: String,

        receivedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

PurchaseSchema.index({ createdAt: -1 });
PurchaseSchema.index({ supplierId: 1, createdAt: -1 });

export const PurchaseModel =
    models.Purchase || model("Purchase", PurchaseSchema);
