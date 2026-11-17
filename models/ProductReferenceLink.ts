import { Schema, model, models } from "mongoose";

/**
 * Vínculo entre un producto propio y su equivalente en una tienda de referencia, para comparar
 * precios de venta. Uno por producto y tienda. Los precios se leen del ítem del catálogo local
 * (ReferenceCatalogItem), que se actualiza solo.
 */
const ProductReferenceLinkSchema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        source: { type: String, required: true },
        itemId: {
            type: Schema.Types.ObjectId,
            ref: "ReferenceCatalogItem",
            required: true,
            index: true,
        },
        matchMethod: {
            type: String,
            enum: ["part_number", "ean", "name", "manual"],
            default: "manual",
        },
        // Desvinculado por el admin: no se muestra ni se vuelve a vincular solo (la vinculación
        // automática por código saltea productos con vínculo en esa tienda, aunque esté descartado)
        dismissed: { type: Boolean, default: false },
    },
    { timestamps: true },
);

ProductReferenceLinkSchema.index({ productId: 1, source: 1 }, { unique: true });

export const ProductReferenceLinkModel =
    models.ProductReferenceLink ||
    model("ProductReferenceLink", ProductReferenceLinkSchema, "product_reference_links");
