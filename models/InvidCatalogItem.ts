import { Schema, model, models } from "mongoose";

// Copia local del catálogo de Invid: su API no tiene búsqueda y limita a 50 requests/hora,
// así que se sincroniza completo en segundo plano y las búsquedas se resuelven acá.
const InvidCatalogItemSchema = new Schema(
    {
        invidId: {
            type: String,
            required: true,
            unique: true,
        },
        title: { type: String, required: true },
        partNumber: { type: String, default: "" },
        ean: { type: String, default: "" },
        brand: { type: String, default: "" },

        // Precio sin impuestos y precio final (con IVA e impuestos internos), en la moneda de Invid
        price: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 },
        ivaPercent: { type: Number, default: 0 },
        internalTaxPercent: { type: Number, default: 0 },
        currency: { type: String, default: "" },

        // Precio final anterior, registrado cuando la sincronización detecta una variación significativa
        previousFinalPrice: { type: Number, default: null },
        priceChangedAt: { type: Date, default: null },

        // null si la cuenta no tiene permiso para ver cantidades (sólo llega STOCK_STATUS)
        stock: { type: Number, default: null },
        stockStatus: { type: String, default: "" },
        available: { type: Boolean, default: true, index: true },

        imageUrl: { type: String, default: null },

        categoryId: { type: String, default: "" },
        category: { type: String, default: "" },
        categories: {
            type: [
                {
                    _id: false,
                    id: String,
                    name: String,
                    isPrimary: Boolean,
                    parentId: { type: String, default: null },
                    parentName: { type: String, default: null },
                },
            ],
            default: [],
        },
        // IDs y nombres normalizados (incluye categorías padre) para filtrar
        categoryIds: { type: [String], default: [], index: true },
        categoryNames: { type: [String], default: [], index: true },

        // Título, marca, part number, ID y EAN normalizados con normalizeSearch
        searchText: { type: String, default: "" },

        syncedAt: { type: Date, required: true },
    },
    { timestamps: true },
);

export const InvidCatalogItemModel =
    models.InvidCatalogItem ||
    model("InvidCatalogItem", InvidCatalogItemSchema, "invid_catalog_items");
