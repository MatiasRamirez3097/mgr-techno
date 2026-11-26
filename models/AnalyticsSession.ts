import { Schema, model, models } from "mongoose";

/** Días que se guarda el detalle de cada visita (los contadores diarios quedan para siempre). */
export const ANALYTICS_SESSION_RETENTION_DAYS = 365;

/**
 * Una visita a la tienda (se corta tras 30 minutos sin actividad). Visitante anónimo: un id
 * aleatorio guardado en el navegador, sin IP ni datos personales.
 */
const AnalyticsSessionSchema = new Schema(
    {
        sessionId: { type: String, required: true, unique: true },
        visitorId: { type: String, required: true, index: true },
        // Día de inicio en Argentina (YYYY-MM-DD)
        date: { type: String, required: true, index: true },
        startedAt: { type: Date, required: true },
        lastSeenAt: { type: Date, required: true },

        channel: { type: String, required: true },
        source: { type: String, default: "" },
        medium: { type: String, default: "" },
        campaign: { type: String, default: "" },
        referrerHost: { type: String, default: "" },
        landingPath: { type: String, default: "" },
        landingPage: { type: String, default: "" },

        device: { type: String, enum: ["mobile", "tablet", "desktop"], default: "desktop" },
        country: { type: String, default: "" },
        region: { type: String, default: "" },
        city: { type: String, default: "" },

        pageViews: { type: Number, default: 0 },
        productViews: { type: Number, default: 0 },
        addToCarts: { type: Number, default: 0 },
        visitedDailyDeals: { type: Boolean, default: false },
        reachedCheckout: { type: Boolean, default: false },
    },
    { versionKey: false },
);

AnalyticsSessionSchema.index(
    { startedAt: 1 },
    { expireAfterSeconds: ANALYTICS_SESSION_RETENTION_DAYS * 24 * 60 * 60 },
);
AnalyticsSessionSchema.index({ date: 1, channel: 1 });

export const AnalyticsSessionModel =
    models.AnalyticsSession ||
    model("AnalyticsSession", AnalyticsSessionSchema, "analytics_sessions");
