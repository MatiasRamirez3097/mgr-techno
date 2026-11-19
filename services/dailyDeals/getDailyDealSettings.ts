import { connectDB } from "@/lib/mongodb";
import { DailyDealConfigModel } from "@/models/DailyDealConfig";
import { DEFAULT_DAILY_DEAL_SETTINGS, sortDiscountTiers } from "@/lib/dailyDeals/selection";
import type { DailyDealGroupDTO, DailyDealSettingsDTO } from "@/types/shared/dailyDeals";

export const DAILY_DEAL_CONFIG_ID = "daily-deals";

export type DailyDealSettingsDoc = Partial<Omit<DailyDealSettingsDTO, "groups">> & {
    groups?: Partial<DailyDealGroupDTO>[];
    // Formato anterior a los escalones: un único escalón
    minMarginPercent?: number;
    discountPercent?: number;
};

function mapDiscountTiers(doc: DailyDealSettingsDoc | null) {
    if (doc?.discountTiers?.length) return sortDiscountTiers(doc.discountTiers);
    if (doc?.minMarginPercent != null && doc.discountPercent != null) {
        return [{ minMarginPercent: doc.minMarginPercent, discountPercent: doc.discountPercent }];
    }
    return DEFAULT_DAILY_DEAL_SETTINGS.discountTiers;
}

export function mapDailyDealSettings(doc: DailyDealSettingsDoc | null): DailyDealSettingsDTO {
    const d = DEFAULT_DAILY_DEAL_SETTINGS;
    return {
        enabled: doc?.enabled ?? d.enabled,
        productCount: doc?.productCount ?? d.productCount,
        noRepeatDays: doc?.noRepeatDays ?? d.noRepeatDays,
        discountTiers: mapDiscountTiers(doc).map((t) => ({
            minMarginPercent: t.minMarginPercent,
            discountPercent: t.discountPercent,
        })),
        requireDistributorStock: doc?.requireDistributorStock ?? d.requireDistributorStock,
        startDate: doc?.startDate ?? d.startDate,
        groups: (doc?.groups ?? []).map((g, index) => ({
            id: g.id || `group-${index + 1}`,
            name: g.name || `Grupo ${index + 1}`,
            distributors: g.distributors ?? [],
            categoryIds: g.categoryIds ?? [],
            brandIds: g.brandIds ?? [],
            maxProducts: g.maxProducts ?? null,
        })),
    };
}

/** Configuración de las ofertas del día (sólo admin; los valores por defecto si no se guardó nunca) */
export async function getDailyDealSettings(): Promise<DailyDealSettingsDTO> {
    await connectDB();
    const doc = await DailyDealConfigModel.findById(DAILY_DEAL_CONFIG_ID).lean<DailyDealSettingsDoc>();
    return mapDailyDealSettings(doc);
}
