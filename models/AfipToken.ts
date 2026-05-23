import { Schema, model, models } from "mongoose";

const AfipTokenSchema = new Schema(
    {
        ws: {
            type: String,
            required: true,
            unique: true,
        },

        token: {
            type: String,
            required: true,
        },

        sign: {
            type: String,
            required: true,
        },

        expirationTime: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export const AfipTokenModel =
    models.AfipToken || model("AfipToken", AfipTokenSchema);
