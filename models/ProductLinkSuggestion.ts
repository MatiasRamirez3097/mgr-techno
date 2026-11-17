import { Schema, model, models } from "mongoose";

/**
 * Posible equivalente de un producto en un distribuidor, encontrado por la búsqueda automática
 * (part number, EAN o nombre parecido). No es un vínculo: el admin lo confirma o lo descarta.
 * Las descartadas se conservan (dismissedAt) para no volver a sugerirlas.
 */
const ProductLinkSuggestionSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        distributor: {
            type: String,
            enum: ["elit", "newbytes", "invid", "air", "pcmodd"],
            required: true,
        },
        distributorProductId: { type: String, required: true },
        distributorSku: { type: String, default: "" },
        name: { type: String, required: true },
        link: { type: String, default: null },
        image: { type: String, default: null },
        // Costo al momento de la búsqueda (ARS con IVA)
        price: { type: Number, default: 0 },
        stock: { type: Number, default: 0 },
        stockLabel: { type: String, default: null },
        matchMethod: { type: String, enum: ["part_number", "ean", "name"], required: true },
        // Código que coincidió (part number / EAN); vacío en las coincidencias por nombre
        matchedValue: { type: String, default: "" },
        // Similitud del nombre (0 a 1); 1 en las coincidencias por código
        score: { type: Number, default: 1 },
        dismissedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

ProductLinkSuggestionSchema.index({ productId: 1, distributor: 1, distributorProductId: 1 }, { unique: true });
ProductLinkSuggestionSchema.index({ dismissedAt: 1, productId: 1 });

export const ProductLinkSuggestionModel =
    models.ProductLinkSuggestion ||
    model("ProductLinkSuggestion", ProductLinkSuggestionSchema, "product_link_suggestions");
