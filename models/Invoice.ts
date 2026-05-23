import { model, models, Schema } from "mongoose";

const InvoiceSchema = new Schema(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },
        customerSnapshot: {
            name: String,
            documentType: Number,
            documentNumber: String,
            taxCondition: {
                id: Number,
                label: String,
            },
            address: String,
        },
        itemsSnapshot: [
            {
                productId: Schema.Types.ObjectId,
                title: String,
                quantity: Number,
                unitPrice: Number,
                taxRate: Number,
                subtotal: Number,
            },
        ],
        totalsSnapshot: {
            subtotal: Number,
            iva: Number,
            total: Number,
        },
        type: {
            type: String,
            enum: ["FA", "FB", "NCA", "NCB"],
            required: true,
        },
        pointOfSale: Number,
        voucherType: Number,
        voucherNumber: Number,
        cae: String,
        caeExpiration: String,
        afipStatus: {
            type: String,
            enum: ["pending", "authorized", "rejected", "error"],
            default: "pending",
        },
        afipRequestXml: String,
        afipResponseXml: String,
        afipResult: Schema.Types.Mixed,
        pdfUrl: String,
        pdfPublicId: String,
        qrUrl: String,
        qrPayload: Schema.Types.Mixed,
    },

    {
        timestamps: true,
    },
);

export const InvoiceModel = models.Invoice || model("Invoice", InvoiceSchema);
