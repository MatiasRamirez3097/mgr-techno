import { Schema, model, models } from "mongoose";

/**
 * Contadores diarios de la tienda: vistas por tipo de página, vistas de producto y agregados
 * al carrito por producto (con la página desde donde se agregó). Se suman con $inc al llegar
 * cada evento y no vencen.
 */
const AnalyticsDailySchema = new Schema(
    {
        // Día en Argentina (YYYY-MM-DD)
        date: { type: String, required: true },
        event: { type: String, enum: ["page_view", "product_view", "add_to_cart"], required: true },
        // Tipo de página (classifyPage): donde se vio o desde donde se agregó
        page: { type: String, required: true },
        productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
        count: { type: Number, default: 0 },
    },
    { versionKey: false },
);

AnalyticsDailySchema.index({ date: 1, event: 1, page: 1, productId: 1 }, { unique: true });
AnalyticsDailySchema.index({ event: 1, productId: 1, date: 1 });

export const AnalyticsDailyModel =
    models.AnalyticsDaily || model("AnalyticsDaily", AnalyticsDailySchema, "analytics_daily");
