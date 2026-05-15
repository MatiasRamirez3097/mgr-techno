import { Schema } from "mongoose";
import { AddressSchema } from "./Address";

export const BillingSchema = new Schema(
    {
        ...AddressSchema.obj,
        documentNumber: { type: String, required: true },
        documentType: { type: String, required: true },
    },
    { _id: false },
);
