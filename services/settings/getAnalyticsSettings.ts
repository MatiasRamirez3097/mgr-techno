import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import type { AnalyticsSettingsDTO } from "@/types/shared/settings";

export type AnalyticsSettingsDoc = Partial<AnalyticsSettingsDTO>;

export const mapAnalyticsSettings = (doc: AnalyticsSettingsDoc | null): AnalyticsSettingsDTO => ({
    analyticsDigestEnabled: doc?.analyticsDigestEnabled ?? true,
});

/** Configuración de la medición de visitas (sólo admin; no va en getStoreSettings). */
export async function getAnalyticsSettings(): Promise<AnalyticsSettingsDTO> {
    await connectDB();
    const doc = await StoreSettingsModel.findById("store", { analyticsDigestEnabled: 1 }).lean<AnalyticsSettingsDoc>();
    return mapAnalyticsSettings(doc);
}
