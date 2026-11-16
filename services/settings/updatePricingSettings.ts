import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { pricingSettingsSchema } from "@/lib/validators/storeSettingsSchema";
import type { PricingSettingsDTO } from "@/types/shared/settings";
import { mapPricingSettings, type PricingSettingsDoc } from "./getPricingSettings";

export async function updatePricingSettings(data: unknown): Promise<PricingSettingsDTO> {
    const parsed = pricingSettingsSchema.parse(data);
    await connectDB();
    const doc = await StoreSettingsModel.findByIdAndUpdate(
        "store",
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<PricingSettingsDoc>();
    return mapPricingSettings(doc);
}
