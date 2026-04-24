//import mongoose, { Schema, model, models } from "mongoose";
import mongoose, { Schema } from "mongoose";
mongoose.models;

interface Product {
    regularPrice: number;
    salePrice?: number | null;
}

export const ProductSchema = new Schema(
    {
        name: { type: String, required: true },
        slug: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["simple", "bundle"],
            default: "simple",
            index: true,
        },
        taxRate: { type: Number },
        regularPrice: { type: Number, required: true },
        salePrice: {
            type: Number,
            default: null,
            validate: {
                validator: function (this: Product, value: number | null) {
                    if (value == null) return true;
                    return value < this.regularPrice;
                },
                message: "salePrice debe ser menor que regularPrice",
            },
        },
        image: { type: String },
        images: [{ type: String }],
        hasSerialNumber: { type: Boolean, required: true, default: false },
        manageStock: {
            type: Boolean,
            default: true,
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
ProductSchema.index({ featured: 1 });
ProductSchema.virtual("stockStatus").get(async function () {
    const count = await mongoose.model("InventoryItem").countDocuments({
        productId: this._id,
        status: "available",
    });

    if (count === 0) return "outofstock";
    if (count < 5) return "onbackorder"; // umbral configurable
    return "instock";
});

export const ProductModel =
    mongoose.models.Product || mongoose.model("Product", ProductSchema);
