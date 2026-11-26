import { Schema, model, models } from "mongoose";

/**
 * Búsquedas de la tienda por día y término (normalizado: minúsculas, sin tildes ni signos).
 * Una por término en cada visita. `zeroResults` cuenta las que no encontraron productos con
 * stock. No vence.
 */
const AnalyticsSearchDailySchema = new Schema(
    {
        // Día en Argentina (YYYY-MM-DD)
        date: { type: String, required: true },
        term: { type: String, required: true },
        searches: { type: Number, default: 0 },
        zeroResults: { type: Number, default: 0 },
        // Resultados de la última búsqueda de ese día
        lastResults: { type: Number, default: 0 },
    },
    { versionKey: false },
);

AnalyticsSearchDailySchema.index({ date: 1, term: 1 }, { unique: true });

export const AnalyticsSearchDailyModel =
    models.AnalyticsSearchDaily ||
    model("AnalyticsSearchDaily", AnalyticsSearchDailySchema, "analytics_search_daily");
