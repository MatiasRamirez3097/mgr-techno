// /models/purchase/PurchaseDocument.ts

import { Schema } from "mongoose";

export const PurchaseDocumentSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["invoice", "receipt", "remito", "other"],
            default: "other",
        },
        number: {
            type: String,
            index: true,
        },
        fileUrl: String,
        fileName: String,
        date: Date,
    },
    { _id: false },
);
