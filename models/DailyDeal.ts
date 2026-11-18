import { Schema, model, models } from "mongoose";
import { DISTRIBUTOR_KEYS } from "@/types/shared/distributorLink";

/**
 * Tanda de ofertas de un día (hora de Argentina). Guarda el precio que tenía cada producto para
 * restaurarlo al terminar, y sirve de historial para no repetir productos.
 */
const DailyDealItemSchema = new Schema(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        regularPrice: { type: Number, required: true },
        // salePrice antes de la oferta (siempre null: no participan productos con oferta propia)
        previousSalePrice: { type: Number, default: null },
        dealPrice: { type: Number, required: true },
        cost: { type: Number, required: true },
        costDistributor: { type: String, enum: DISTRIBUTOR_KEYS, required: true },
        groupId: { type: String, required: true },
        repeated: { type: Boolean, default: false },
        // Si el admin cambió el precio durante el día, al terminar no se restaura
        restored: { type: Boolean, default: false },
    },
    { _id: false },
);

const DailyDealSchema = new Schema(
    {
        // YYYY-MM-DD en hora de Argentina
        date: { type: String, required: true, unique: true },
        startsAt: { type: Date, required: true },
        endsAt: { type: Date, required: true },
        status: { type: String, enum: ["active", "finished", "cancelled"], default: "active", index: true },
        items: { type: [DailyDealItemSchema], default: [] },
    },
    { timestamps: true },
);

DailyDealSchema.index({ "items.productId": 1, date: -1 });

export const DailyDealModel = models.DailyDeal || model("DailyDeal", DailyDealSchema, "daily_deals");
