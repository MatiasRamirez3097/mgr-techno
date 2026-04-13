import { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
    {
        wooId: { type: Number, required: true, unique: true, index: true },
        name: { type: String, required: true },
        slug: { type: String, required: true, index: true },
        parent: { type: Number, default: 0 },
        image: { type: String, default: null },
        count: { type: Number, default: 0 },
        syncedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const CategoryModel =
    models.Category || model("Category", CategorySchema);
