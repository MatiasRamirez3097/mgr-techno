import { Schema, model, models } from "mongoose";

const CustomerSchema = new Schema(
    {
        email: { type: String, required: true, unique: true, index: true },
        password: { type: String, required: true }, // bcrypt hash
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String },
        role: { type: String, default: "customer" },
        billing: {
            firstName: String,
            lastName: String,
            address1: String,
            city: String,
            state: String,
            postcode: String,
            phone: String,
            country: { type: String, default: "AR" },
        },
        tipoDocumento: { type: String, default: "DNI" },
        numeroDocumento: { type: String },
        wooId: { type: Number, default: null }, // para referencia con Woo durante la migración
    },
    { timestamps: true },
);

export const CustomerModel =
    models.Customer || model("Customer", CustomerSchema);
