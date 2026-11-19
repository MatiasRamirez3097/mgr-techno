import { connectDB } from "@/lib/mongodb";
import { DailyDealConfigModel } from "@/models/DailyDealConfig";
import { DAILY_DEAL_CONFIG_ID } from "./getDailyDealSettings";
import { createTodayDeal, type CreateTodayDealResult } from "./createTodayDeal";

/** Adelanta el inicio programado: borra la fecha de inicio y genera la oferta de hoy. */
export async function startDailyDealsNow(): Promise<CreateTodayDealResult> {
    await connectDB();
    await DailyDealConfigModel.updateOne({ _id: DAILY_DEAL_CONFIG_ID }, { $set: { startDate: null } });
    return createTodayDeal(new Date(), { replaceCancelled: true });
}
