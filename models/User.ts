import { model, models, Schema } from "mongoose";

export const UserSchema = new Schema(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            unique: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        password: {
            type: String,
            required: true,
        },

        role: {
            type: String,
            default: "customer",
        },
    },
    { timestamps: true },
);

export const UserModel = models.User || model("User", UserSchema);
