import { Schema } from "mongoose";
import { addressDefinition, AddressSchema } from "./Address";

export const BillingSchema = new Schema(
    {
        ...addressDefinition,
        documentNumber: { type: String, required: true },
        documentType: { type: String, required: true },
    },
    { _id: false },
);
