// /models/common/Address.ts

import { Schema } from "mongoose";

export const AddressSchema = new Schema(
    {
        firstName: { type: String },
        lastName: { type: String },
        address1: { type: String },
        city: { type: String },
        state: { type: String },
        postcode: { type: String },
        phone: { type: String },
        country: { type: String, default: "AR" },
    },
    { _id: false },
);
