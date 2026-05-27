import { FiscalDataSchema } from "./FiscalData";
import { Schema } from "mongoose";

export const VoucherSchema = new Schema(
    {
        type: {
            type: String,
            enum: [
                "non_fiscal_receipt", // Comprobante de venta no fiscal
                "fiscal_invoice", // Factura fiscal (A, B, C)
                "credit_note", // Nota de crédito
                "debit_note", // Nota de débito (por si acaso)
            ],
            required: true,
        },
        number: { type: String, required: true }, // Número interno
        generatedAt: { type: Date, required: true, default: Date.now },
        url: { type: String }, // URL del PDF
        publicId: { type: String }, // ID en Cloudinary u otro storage

        // Datos fiscales (solo para comprobantes fiscales)
        fiscalData: {
            type: FiscalDataSchema,
            required: function () {
                return (
                    this.type !== "non_fiscal_receipt" &&
                    this.status === "issued"
                );
            },
        },

        // Para notas de crédito/débito: referencia al comprobante original
        relatedVoucherId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
        },
        relatedVoucherType: { type: String },

        // Metadata adicional
        status: {
            type: String,
            enum: ["draft", "issued", "cancelled", "replaced"],
            default: "issued",
        },
        cancelledAt: { type: Date },
        cancelReason: { type: String },
    },
    { _id: true, timestamps: true },
);
