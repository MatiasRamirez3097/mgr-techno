import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { DEFAULT_PRICING_SETTINGS } from "@/lib/priceReview";
import type { PricingSettingsDTO } from "@/types/shared/settings";

export type PricingSettingsDoc = Partial<PricingSettingsDTO>;

export const mapPricingSettings = (doc: PricingSettingsDoc | null): PricingSettingsDTO => ({
    targetMarginPercent: doc?.targetMarginPercent ?? DEFAULT_PRICING_SETTINGS.targetMarginPercent,
    minMarginPercent: doc?.minMarginPercent ?? DEFAULT_PRICING_SETTINGS.minMarginPercent,
    priceRoundingStep: doc?.priceRoundingStep ?? DEFAULT_PRICING_SETTINGS.priceRoundingStep,
});

/**
 * Márgenes generales y redondeo de la revisión de precios. Va separado de
 * getStoreSettings porque ese se envía al navegador en la tienda pública.
 */
export async function getPricingSettings(): Promise<PricingSettingsDTO> {
    await connectDB();
    const doc = await StoreSettingsModel.findById("store", {
        targetMarginPercent: 1,
        minMarginPercent: 1,
        priceRoundingStep: 1,
    }).lean<PricingSettingsDoc>();
    return mapPricingSettings(doc);
}
