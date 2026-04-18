//import mongoose, { Schema, model, models } from "mongoose";
import mongoose, { Schema } from "mongoose";
mongoose.models;

export const ProductSchema = new Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true, index: true },
        type: {
            type: String,
            enum: ["simple", "bundle"],
            default: "simple",
            index: true,
        },
        taxRate: { type: Number },
        regularPrice: { type: Number, required: true },
        salePrice: { type: Number },
        onSale: { type: Boolean, default: false },
        image: { type: String },
        images: [{ type: String }],
        hasSerialNumber: { type: Boolean, required: true, default: false },
        manageStock: {
            type: Boolean,
            default: true,
        },

        stockQuantity: { type: Number },
        stockStatus: {
            type: String,
            enum: ["instock", "outofstock", "onbackorder"],
            default: "instock",
        },
        shortDescription: { type: String },
        description: { type: String },
        weight: { type: Number },
        dimensions: {
            length: { type: Number },
            width: { type: Number },
            height: { type: Number },
        },
        categories: [
            {
                type: Schema.Types.ObjectId,
                ref: "Category",
            },
        ],
        featured: { type: Boolean, default: false },
        status: { type: String, default: "publish" },
        sku: { type: String },
        bundleItemsCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

// Índices para búsqueda
ProductSchema.index({ name: "text", sku: "text" });
ProductSchema.index({ stockStatus: 1, createdAt: -1 });
ProductSchema.index({ "categories.slug": 1 });
ProductSchema.index({ onSale: 1 });
ProductSchema.index({ featured: 1 });

export const ProductModel =
    mongoose.models.Product || mongoose.model("Product", ProductSchema);
