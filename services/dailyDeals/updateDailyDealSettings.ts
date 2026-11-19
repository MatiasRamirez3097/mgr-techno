import { connectDB } from "@/lib/mongodb";
import { DailyDealConfigModel } from "@/models/DailyDealConfig";
import { dailyDealSettingsSchema } from "@/lib/validators/dailyDealsSchema";
import { hasDealsStarted } from "@/lib/dailyDeals/window";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import type { DailyDealSettingsDTO } from "@/types/shared/dailyDeals";
import {
    DAILY_DEAL_CONFIG_ID,
    getDailyDealSettings,
    mapDailyDealSettings,
    type DailyDealSettingsDoc,
} from "./getDailyDealSettings";
import { cancelTodayDeal } from "./cancelTodayDeal";
import { createTodayDeal, type CreateTodayDealResult } from "./createTodayDeal";

const isRunning = (s: DailyDealSettingsDTO, today: string) => s.enabled && hasDealsStarted(s.startDate, today);

/**
 * Guarda la configuración de las ofertas del día (lanza ZodError si es inválida). Si las ofertas
 * dejan de correr hoy (se desactivan o se programan para otro día), cancela la oferta de hoy y
 * restaura los precios; si empiezan a correr hoy, genera la de hoy en el momento. Una fecha de
 * inicio que ya llegó se guarda como null. Los demás cambios valen desde el próximo sorteo.
 */
export async function updateDailyDealSettings(data: unknown): Promise<{
    settings: DailyDealSettingsDTO;
    cancelled: boolean;
    generated: CreateTodayDealResult | null;
}> {
    const parsed = dailyDealSettingsSchema.parse(data);
    const today = todayInStoreTimeZone();
    if (hasDealsStarted(parsed.startDate, today)) parsed.startDate = null;

    const previous = await getDailyDealSettings();
    await connectDB();
    const doc = await DailyDealConfigModel.findByIdAndUpdate(
        DAILY_DEAL_CONFIG_ID,
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<DailyDealSettingsDoc>();
    const settings = mapDailyDealSettings(doc);

    const wasRunning = isRunning(previous, today);
    const running = isRunning(settings, today);
    let cancelled = false;
    let generated: CreateTodayDealResult | null = null;
    if (wasRunning && !running) cancelled = (await cancelTodayDeal()).cancelled;
    if (!wasRunning && running) generated = await createTodayDeal(new Date(), { replaceCancelled: true });
    return { settings, cancelled, generated };
}
