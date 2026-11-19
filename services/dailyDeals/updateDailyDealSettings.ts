import { connectDB } from "@/lib/mongodb";
import { DailyDealConfigModel } from "@/models/DailyDealConfig";
import { dailyDealSettingsSchema } from "@/lib/validators/dailyDealsSchema";
import type { DailyDealSettingsDTO } from "@/types/shared/dailyDeals";
import { DAILY_DEAL_CONFIG_ID, mapDailyDealSettings, type DailyDealSettingsDoc } from "./getDailyDealSettings";

/** Guarda la configuración de las ofertas del día (lanza ZodError si es inválida). */
export async function updateDailyDealSettings(data: unknown): Promise<DailyDealSettingsDTO> {
    const parsed = dailyDealSettingsSchema.parse(data);
    await connectDB();
    const doc = await DailyDealConfigModel.findByIdAndUpdate(
        DAILY_DEAL_CONFIG_ID,
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<DailyDealSettingsDoc>();
    return mapDailyDealSettings(doc);
}
