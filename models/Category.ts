//import { Schema, model, models } from "mongoose";
import mongoose, { Schema } from "mongoose";
mongoose.models;

export const CategorySchema = new Schema(
    {
        wooId: { type: Number, required: false, sparse: true, index: true },
        name: { type: String, required: true },
        slug: { type: String, required: true, index: true },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            index: true,
        },
        image: { type: String, default: null },
        count: { type: Number, default: 0 },
        menuOrder: { type: Number, default: 999 },
        attributeDefinitions: {
            type: [
                {
                    key: { type: String, required: true },
                    label: { type: String, required: true },
                    type: {
                        type: String,
                        enum: [
                            "select",
                            "multiselect",
                            "number",
                            "boolean",
                            "text",
                        ],
                        default: "select",
                    },
                    options: [{ type: String }],
                    unit: { type: String, default: "" },
                    required: { type: Boolean, default: false },
                    filterable: { type: Boolean, default: true },
                    _id: false,
                },
            ],
            default: [],
        },
        syncedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
);

export const CategoryModel =
    mongoose.models.Category || mongoose.model("Category", CategorySchema);
