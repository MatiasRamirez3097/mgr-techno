import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { analyticsSettingsSchema } from "@/lib/validators/storeSettingsSchema";
import type { AnalyticsSettingsDTO } from "@/types/shared/settings";
import { mapAnalyticsSettings, type AnalyticsSettingsDoc } from "./getAnalyticsSettings";

export async function updateAnalyticsSettings(data: unknown): Promise<AnalyticsSettingsDTO> {
    const parsed = analyticsSettingsSchema.parse(data);
    await connectDB();
    const doc = await StoreSettingsModel.findByIdAndUpdate(
        "store",
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<AnalyticsSettingsDoc>();
    return mapAnalyticsSettings(doc);
}
