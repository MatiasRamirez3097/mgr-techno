import { Schema, model, models } from "mongoose";
import { DISTRIBUTOR_KEYS } from "@/types/shared/distributorLink";

/**
 * Configuración de las ofertas del día (documento único, _id "daily-deals"). Va aparte de
 * StoreSettings porque tiene listas (grupos de reglas) y es sólo del admin.
 */
const DailyDealGroupSchema = new Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        distributors: [{ type: String, enum: DISTRIBUTOR_KEYS }],
        categoryIds: [{ type: String }],
        brandIds: [{ type: String }],
        maxProducts: { type: Number, default: null },
    },
    { _id: false },
);

const DailyDealDiscountTierSchema = new Schema(
    {
        minMarginPercent: { type: Number, required: true, min: 0 },
        discountPercent: { type: Number, required: true, min: 1 },
    },
    { _id: false },
);

const DailyDealConfigSchema = new Schema(
    {
        _id: { type: String, default: "daily-deals" },
        enabled: { type: Boolean, default: false },
        productCount: { type: Number, default: 6, min: 1 },
        noRepeatDays: { type: Number, default: 7, min: 0 },
        // Escalones utilidad → descuento (reemplazan a minMarginPercent/discountPercent, que se
        // leen como un único escalón si un documento viejo todavía no los tiene)
        discountTiers: { type: [DailyDealDiscountTierSchema], default: undefined },
        requireDistributorStock: { type: Boolean, default: true },
        // YYYY-MM-DD: las ofertas empiezan ese día a las 00:00 (null = ya empezaron)
        startDate: { type: String, default: null },
        groups: { type: [DailyDealGroupSchema], default: [] },
    },
    { timestamps: true },
);

export const DailyDealConfigModel =
    models.DailyDealConfig || model("DailyDealConfig", DailyDealConfigSchema, "daily_deal_config");
