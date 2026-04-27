import mongoose, { Schema, model, models } from "mongoose";

const CounterSchema = new Schema(
    {
        _id: {
            type: String,
            required: true,
        },

        seq: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

export const CounterModel = models.Counter || model("Counter", CounterSchema);
