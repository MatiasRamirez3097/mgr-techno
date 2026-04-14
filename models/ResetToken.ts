import { Schema, model, models } from "mongoose";

const ResetTokenSchema = new Schema({
    email: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
});

export const ResetTokenModel =
    models.ResetToken || model("ResetToken", ResetTokenSchema);
