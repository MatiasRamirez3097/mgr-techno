import { Schema, model, models } from "mongoose";

// Copia local de los catálogos de las tiendas que se usan como referencia de precio de venta.
// La lista de URLs sale del sitemap de cada tienda y los datos de cada página de producto.
const ReferenceCatalogItemSchema = new Schema(
    {
        // Clave de la fuente (lib/priceReference/sources.ts)
        source: { type: String, required: true },
        url: { type: String, required: true },
        // ID propio de la tienda, en las fuentes que lo tienen (catálogo JSON): la URL puede
        // cambiar si editan el nombre, así que esas se identifican por acá
        externalId: { type: String, default: undefined },

        name: { type: String, default: "" },
        sku: { type: String, default: "" },
        gtin: { type: String, default: "" },
        brand: { type: String, default: "" },
        image: { type: String, default: null },
        categoryPath: { type: [String], default: [] },

        // Precio vigente (oferta si la hay) y precio de lista, en la moneda de la tienda
        price: { type: Number, default: null },
        listPrice: { type: Number, default: null },
        currency: { type: String, default: "ARS" },
        inStock: { type: Boolean, default: false },

        // Precio vigente anterior, registrado cuando cambia
        previousPrice: { type: Number, default: null },
        priceChangedAt: { type: Date, default: null },

        // Fecha de modificación informada por el sitemap: si es posterior a fetchedAt, se relee antes
        lastmod: { type: Date, default: null },
        inSitemap: { type: Boolean, default: true },
        sitemapSeenAt: { type: Date, default: null },
        // Desde cuándo no está en el sitemap o su página da 404 (null = está)
        missingSince: { type: Date, default: null },

        fetchedAt: { type: Date, default: null },
        fetchError: { type: String, default: null },

        // Lo marca la vinculación con productos propios: se actualiza más seguido
        linked: { type: Boolean, default: false },

        // Nombre, marca, SKU y GTIN normalizados con normalizeSearch
        searchText: { type: String, default: "" },
    },
    { timestamps: true },
);

ReferenceCatalogItemSchema.index({ source: 1, url: 1 }, { unique: true });
ReferenceCatalogItemSchema.index(
    { source: 1, externalId: 1 },
    { unique: true, partialFilterExpression: { externalId: { $type: "string" } } },
);
ReferenceCatalogItemSchema.index({ source: 1, sku: 1 });
ReferenceCatalogItemSchema.index({ source: 1, inSitemap: 1, fetchedAt: 1 });

export const ReferenceCatalogItemModel =
    models.ReferenceCatalogItem ||
    model("ReferenceCatalogItem", ReferenceCatalogItemSchema, "reference_catalog_items");
