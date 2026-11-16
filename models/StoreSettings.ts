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
        // Revisión de precios (sólo admin; no se expone en getStoreSettings, que llega
        // al navegador en la tienda). Margen sobre el costo, en %; las categorías pueden
        // definir los suyos.
        targetMarginPercent: { type: Number, default: 20, min: 0, max: 1000 },
        minMarginPercent: { type: Number, default: 10, min: 0, max: 1000 },
        // Los precios sugeridos se redondean hacia arriba a un múltiplo de este valor
        priceRoundingStep: { type: Number, default: 100, min: 1 },
    },
    { timestamps: true },
);

export const StoreSettingsModel =
    models.StoreSettings || model("StoreSettings", StoreSettingsSchema);
