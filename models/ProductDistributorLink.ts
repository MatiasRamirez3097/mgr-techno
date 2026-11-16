import { Schema, model, models } from "mongoose";

/**
 * Vínculo entre un producto propio y su equivalente en un distribuidor, para comparar
 * el precio de venta con el costo. Uno por producto y distribuidor.
 */
const ProductDistributorLinkSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        distributor: {
            type: String,
            enum: ["elit", "newbytes", "invid", "air"],
            required: true,
        },
        distributorProductId: { type: String, required: true },
        distributorSku: { type: String, default: "" },
        name: { type: String, required: true },
        link: { type: String, default: null },
        image: { type: String, default: null },
        matchMethod: {
            type: String,
            enum: ["part_number", "ean", "manual"],
            default: "manual",
        },
        // Último costo visto (ARS con IVA), para Elit y NewBytes que no tienen copia local
        lastPrice: { type: Number, default: null },
        lastStock: { type: Number, default: null },
        lastStockLabel: { type: String, default: null },
        lastCheckedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

ProductDistributorLinkSchema.index({ productId: 1, distributor: 1 }, { unique: true });
ProductDistributorLinkSchema.index({ distributor: 1, distributorProductId: 1 });

export const ProductDistributorLinkModel =
    models.ProductDistributorLink ||
    model("ProductDistributorLink", ProductDistributorLinkSchema, "product_distributor_links");
