import { Schema, model, models } from "mongoose";

export const BrandSchema = new Schema(
    {
        name: {
            type: String,

            required: true,

            unique: true,

            trim: true,
        },

        slug: {
            type: String,

            required: true,

            unique: true,

            lowercase: true,

            trim: true,
        },

        logo: {
            type: String,
        },

        description: {
            type: String,
        },

        isActive: {
            type: Boolean,

            default: true,
        },
    },
    {
        timestamps: true,
    },
);

export const BrandModel = models.Brand || model("Brand", BrandSchema);
