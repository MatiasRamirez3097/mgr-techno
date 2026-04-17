import { Schema, model, models } from "mongoose";

export const SupplierSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
        },

        // Identificación fiscal (clave en Argentina)
        taxId: {
            type: String, // CUIT
            index: true,
        },

        email: String,
        phone: String,

        website: String,

        address: {
            street: String,
            city: String,
            state: String,
            zip: String,
            country: { type: String, default: "AR" },
        },

        contactName: String,

        notes: String,

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
