import { connectDB } from "@/lib/mongodb";
import { DailyDealConfigModel } from "@/models/DailyDealConfig";
import { dailyDealSettingsSchema } from "@/lib/validators/dailyDealsSchema";
import type { DailyDealSettingsDTO } from "@/types/shared/dailyDeals";
import {
    DAILY_DEAL_CONFIG_ID,
    getDailyDealSettings,
    mapDailyDealSettings,
    type DailyDealSettingsDoc,
} from "./getDailyDealSettings";
import { cancelTodayDeal } from "./cancelTodayDeal";
import { createTodayDeal, type CreateTodayDealResult } from "./createTodayDeal";

/**
 * Guarda la configuración de las ofertas del día (lanza ZodError si es inválida). Al desactivar,
 * cancela la oferta de hoy y restaura los precios; al activar, genera la de hoy en el momento.
 * Los demás cambios valen desde el próximo sorteo.
 */
export async function updateDailyDealSettings(data: unknown): Promise<{
    settings: DailyDealSettingsDTO;
    cancelled: boolean;
    generated: CreateTodayDealResult | null;
}> {
    const parsed = dailyDealSettingsSchema.parse(data);
    const previous = await getDailyDealSettings();
    await connectDB();
    const doc = await DailyDealConfigModel.findByIdAndUpdate(
        DAILY_DEAL_CONFIG_ID,
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<DailyDealSettingsDoc>();
    const settings = mapDailyDealSettings(doc);

    let cancelled = false;
    let generated: CreateTodayDealResult | null = null;
    if (previous.enabled && !settings.enabled) cancelled = (await cancelTodayDeal()).cancelled;
    if (!previous.enabled && settings.enabled) generated = await createTodayDeal(new Date(), { replaceCancelled: true });
    return { settings, cancelled, generated };
}
