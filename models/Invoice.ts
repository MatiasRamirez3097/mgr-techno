import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,

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
                productId: mongoose.Schema.Types.ObjectId,

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

        afipResult: mongoose.Schema.Types.Mixed,

        pdfUrl: String,

        pdfPublicId: String,
    },

    {
        timestamps: true,
    },
);

export const InvoiceModel =
    mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
