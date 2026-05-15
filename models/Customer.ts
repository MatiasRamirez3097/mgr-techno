import { Schema, model, models } from "mongoose";

export const CustomerSchema = new Schema(
    {
        email: { type: String, required: false, unique: true, sparse: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String },
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
        document: {
            documentType: {
                type: String,
                default: "DNI",
            },
            number: String,
        },
    },
    { timestamps: true },
);

export const CustomerModel =
    models.Customer || model("Customer", CustomerSchema);
