import { Schema, model, models } from "mongoose";

const QuoteItemSchema = new Schema(
    {
        origin: {
            type: String,
            enum: ["internal", "distributor", "manual"],
            default: "internal",
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            default: null,
        },
        distributor: {
            type: String,
            default: null,
        },
        distributorSku: {
            type: String,
            default: null,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        sku: {
            type: String,
            default: "",
            trim: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        costPrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        taxRate: {
            type: Number,
            default: 10.5,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: true },
);

const QuoteCustomerSchema = new Schema(
    {
        id: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            default: "",
            trim: true,
        },
        phone: {
            type: String,
            default: "",
            trim: true,
        },
        documentType: {
            type: String,
            default: "DNI",
        },
        documentNumber: {
            type: String,
            default: "",
            trim: true,
        },
        ivaCondition: {
            type: String,
            default: "Consumidor Final",
        },
        address: {
            street: { type: String, default: "" },
            number: { type: String, default: "" },
            city: { type: String, default: "" },
            state: { type: String, default: "" },
            zip: { type: String, default: "" },
        },
    },
    { _id: false },
);

export const QuoteSchema = new Schema(
    {
        number: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        date: {
            type: Date,
            default: Date.now,
            required: true,
        },
        expirationDate: {
            type: Date,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: [
                "draft",
                "sent",
                "accepted",
                "expired",
                "rejected",
                "converted",
            ],
            default: "draft",
            index: true,
        },
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
            index: true,
        },
        customer: {
            type: QuoteCustomerSchema,
            required: true,
        },
        items: {
            type: [QuoteItemSchema],
            default: [],
        },
        currency: {
            type: String,
            enum: ["ARS", "USD"],
            default: "ARS",
        },
        exchangeRate: {
            type: Number,
            default: 1,
            min: 0,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        ivaTotal: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        discountTotal: {
            type: Number,
            default: 0,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        notes: {
            type: String,
            default: "",
        },
        terms: {
            type: String,
            default:
                "Presupuesto válido hasta la fecha de vencimiento. Precios sujetos a modificación sin previo aviso en caso de variación cambiaria.",
        },
        pdfUrl: {
            type: String,
            default: null,
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

export const QuoteModel =
    models.Quote || model("Quote", QuoteSchema, "quotes");
