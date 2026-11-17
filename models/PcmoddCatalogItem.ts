import { Schema, model, models } from "mongoose";

// Copia local de la lista de PCMODD: una hoja de Google Sheets pública (PCMODD_SHEET_URL) que se
// lee cada hora. No tiene códigos ni stock: los ítems se identifican por marca + nombre.
const PcmoddCatalogItemSchema = new Schema(
    {
        pcmoddId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        // Marca del encabezado de grupo de la hoja; sirve de "categoría" para el comparador
        brand: { type: String, default: "", index: true },

        // Precio en USD sin IVA y con IVA (columna C de la hoja)
        price: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 },
        ivaPercent: { type: Number, default: 0 },
        currency: { type: String, default: "USD" },

        // Precio con IVA anterior, registrado cuando la sincronización detecta una variación significativa
        previousFinalPrice: { type: Number, default: null },
        priceChangedAt: { type: Date, default: null },

        available: { type: Boolean, default: true, index: true },
        // Posición en la hoja
        row: { type: Number, default: 0 },

        // Marca y nombre normalizados con normalizeSearch
        searchText: { type: String, default: "" },

        syncedAt: { type: Date, required: true },
    },
    { timestamps: true },
);

export const PcmoddCatalogItemModel =
    models.PcmoddCatalogItem ||
    model("PcmoddCatalogItem", PcmoddCatalogItemSchema, "pcmodd_catalog_items");
