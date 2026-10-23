import { Schema, model, models } from "mongoose";

// Cotizaciones de moneda (_id = "USD_OFICIAL": dólar oficial BNA)
const ExchangeRateSchema = new Schema(
    {
        _id: { type: String, required: true },
        buy: { type: Number, required: true },
        sell: { type: Number, required: true },
        source: { type: String, required: true },
        // Fecha de actualización informada por la fuente
        sourceUpdatedAt: { type: Date, default: null },
        // Última vez que la consultamos
        fetchedAt: { type: Date, required: true },
    },
    { timestamps: true },
);

export const ExchangeRateModel =
    models.ExchangeRate ||
    model("ExchangeRate", ExchangeRateSchema, "exchange_rates");
