import { Schema, model, models } from "mongoose";

export const SupplierSchema = new Schema(
    {
        taxId: {
            type: String,
            index: {
                unique: true,
                partialFilterExpression: {
                    taxId: { $type: "string" },
                },
            },
        },
        name: {
            type: String,
            required: true,
            index: true,
        },

        email: { type: String, required: false },
        phone: { type: String, required: false },

        website: { type: String, required: false },

        address: {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: { type: String, default: "AR" },
        },

        contactName: { type: String, required: false },

        notes: { type: String, required: false },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true },
);

export const SupplierModel =
    models.Supplier || model("Supplier", SupplierSchema);
