import { Schema } from "mongoose";

export const FiscalDataSchema = new Schema(
    {
        cae: { type: String }, // Código de Autorización Electrónico (AFIP)
        caeExpirationDate: { type: Date },
        fiscalNumber: { type: String }, // Número de comprobante fiscal
        fiscalPointOfSale: { type: Number }, // Punto de venta
        fiscalType: {
            type: String,
            enum: ["A", "B"], // Tipos de factura AFIP
        },
        afipAuthorizedAt: { type: Date },
        qrData: { type: Schema.Types.Mixed }, // QR code data de AFIP
    },
    { _id: false },
);
