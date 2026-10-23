import { Schema, model, models } from "mongoose";

// Copia local de la lista de precios de AIR: no tienen API pública, así que la lista CSV
// se descarga de su intranet (login con usuario y contraseña) y las búsquedas se resuelven acá.
const AirCatalogItemSchema = new Schema(
    {
        // Columna "Codigo" de la lista
        airId: {
            type: String,
            required: true,
            unique: true,
        },
        title: { type: String, required: true },
        partNumber: { type: String, default: "" },
        // "Grupo" de AIR (marca)
        brandId: { type: String, default: "" },
        brand: { type: String, default: "" },
        // "Rubro" de AIR (categoría)
        categoryId: { type: String, default: "", index: true },
        category: { type: String, default: "" },

        // Precio de lista sin IVA y precio con IVA, en USD
        price: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 },
        ivaPercent: { type: Number, default: 0 },
        currency: { type: String, default: "USD" },

        // Precio con IVA anterior, registrado cuando la sincronización detecta una variación significativa
        previousFinalPrice: { type: Number, default: null },
        priceChangedAt: { type: Date, default: null },

        // Stock del depósito que usamos (Rosario) y de todos los depósitos
        stock: { type: Number, default: 0 },
        stockByWarehouse: {
            ROS: { type: Number, default: 0 },
            MZA: { type: Number, default: 0 },
            CBA: { type: Number, default: 0 },
            LUG: { type: Number, default: 0 },
        },
        available: { type: Boolean, default: true, index: true },

        // Columna "Tipo" de la lista; todavía no se usa
        type: { type: String, default: "" },

        // Título, marca, part number y código normalizados con normalizeSearch
        searchText: { type: String, default: "" },

        syncedAt: { type: Date, required: true },
    },
    { timestamps: true },
);

export const AirCatalogItemModel =
    models.AirCatalogItem || model("AirCatalogItem", AirCatalogItemSchema, "air_catalog_items");
