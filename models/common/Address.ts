import { Schema } from "mongoose";

export const addressDefinition = {
    firstName: { type: String },
    lastName: { type: String },
    address1: { type: String },
    city: { type: String },
    state: { type: String },
    postcode: { type: String },
    phone: { type: String },
    country: { type: String, default: "AR" },
};

export const AddressSchema = new Schema(addressDefinition, { _id: false });
