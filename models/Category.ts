//import { Schema, model, models } from "mongoose";
import mongoose, { Schema } from "mongoose";
mongoose.models;

const CategorySchema = new Schema(
    {
        wooId: { type: Number, required: true, unique: true, index: true },
        name: { type: String, required: true },
        slug: { type: String, required: true, index: true },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            index: true,
        },
        image: { type: String, default: null },
        count: { type: Number, default: 0 },
        syncedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const CategoryModel =
    mongoose.models.Category || mongoose.model("Category", CategorySchema);
