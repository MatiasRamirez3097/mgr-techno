import { Schema, model, models } from "mongoose";

// Documento único (_id = "store") con la configuración editable desde el panel
export const StoreSettingsSchema = new Schema(
    {
        _id: {
            type: String,
            default: "store",
        },
        // Recargo (%) sobre el precio final al pagar con Mercado Pago
        mercadoPagoSurchargePercent: {
            type: Number,
            default: 25,
            min: 0,
            max: 100,
        },
    },
    { timestamps: true },
);

export const StoreSettingsModel =
    models.StoreSettings || model("StoreSettings", StoreSettingsSchema);
