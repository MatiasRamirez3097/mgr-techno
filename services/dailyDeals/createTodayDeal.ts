import { connectDB } from "@/lib/mongodb";
import { DailyDealModel } from "@/models/DailyDeal";
import { dealWindow } from "@/lib/dailyDeals/window";
import { todayInStoreTimeZone } from "@/lib/utils/orderDate";
import { getDailyDealSettings } from "./getDailyDealSettings";
import { previewDailyDeals } from "./previewDailyDeals";
import { applyDealPrice, revalidateDealPages } from "./dealPrices";

export type CreateTodayDealResult =
    | { status: "created"; date: string; items: number; shortfall: number }
    | { status: "skipped"; reason: "disabled" | "exists" | "no_products" };

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

/**
 * Sortea y aplica la tanda de hoy si está activado y todavía no hay una. Primero se guarda la
 * tanda (la fecha es única: si dos ejecuciones se cruzan, la segunda no hace nada) y después se
 * aplican los precios; los productos que cambiaron entre el sorteo y la aplicación se descartan.
 * Una tanda de hoy cancelada bloquea al cron; `replaceCancelled` (acciones del admin) la reemplaza.
 */
export async function createTodayDeal(
    now = new Date(),
    { replaceCancelled = false, excludeProductIds = [] }: { replaceCancelled?: boolean; excludeProductIds?: string[] } = {},
): Promise<CreateTodayDealResult> {
    await connectDB();
    const settings = await getDailyDealSettings();
    if (!settings.enabled) return { status: "skipped", reason: "disabled" };

    // Antes del sorteo (que lee todo el catálogo): el cron horario pasa por acá cada hora
    const today = todayInStoreTimeZone(now);
    if (replaceCancelled) await DailyDealModel.deleteOne({ date: today, status: "cancelled" });
    if (await DailyDealModel.exists({ date: today })) return { status: "skipped", reason: "exists" };

    const preview = await previewDailyDeals(settings, { now, excludeProductIds });
    if (preview.items.length === 0) return { status: "skipped", reason: "no_products" };

    const items = preview.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        slug: i.slug,
        regularPrice: i.regularPrice,
        previousSalePrice: null,
        dealPrice: i.dealPrice,
        cost: i.cost,
        costDistributor: i.costDistributor,
        groupId: i.groupId,
        repeated: i.repeated,
    }));

    let deal;
    try {
        deal = await DailyDealModel.create({ date: preview.date, ...dealWindow(preview.date), status: "active", items });
    } catch (error) {
        if (isDuplicateKey(error)) return { status: "skipped", reason: "exists" };
        throw error;
    }

    const applied = [];
    for (const item of items) {
        if (await applyDealPrice(item)) applied.push(item);
    }
    await DailyDealModel.updateOne({ _id: deal._id }, { $set: { items: applied } });
    revalidateDealPages(applied);

    return {
        status: "created",
        date: preview.date,
        items: applied.length,
        shortfall: Math.max(0, settings.productCount - applied.length),
    };
}
