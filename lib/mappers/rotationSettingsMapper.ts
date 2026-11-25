import { DEFAULT_ROTATION_SETTINGS } from "@/lib/inventory/rotation";
import type { RotationSettingsDTO } from "@/types/shared/stockRotation";

export type RotationSettingsDoc = Partial<RotationSettingsDTO>;

// Campos de StoreSettings que forman la configuración de "Stock a rotar"
export const ROTATION_SETTINGS_FIELDS = Object.keys(DEFAULT_ROTATION_SETTINGS) as (keyof RotationSettingsDTO)[];

export const mapRotationSettingsToDTO = (doc: RotationSettingsDoc | null): RotationSettingsDTO => ({
    rotationSalesWindowDays: doc?.rotationSalesWindowDays ?? DEFAULT_ROTATION_SETTINGS.rotationSalesWindowDays,
    rotationSlowCoverageDays: doc?.rotationSlowCoverageDays ?? DEFAULT_ROTATION_SETTINGS.rotationSlowCoverageDays,
    rotationOldStockDays: doc?.rotationOldStockDays ?? DEFAULT_ROTATION_SETTINGS.rotationOldStockDays,
    rotationCheaperReplacementPercent:
        doc?.rotationCheaperReplacementPercent ?? DEFAULT_ROTATION_SETTINGS.rotationCheaperReplacementPercent,
    rotationCompetitorPercent: doc?.rotationCompetitorPercent ?? DEFAULT_ROTATION_SETTINGS.rotationCompetitorPercent,
    rotationRestockEnabled: doc?.rotationRestockEnabled ?? DEFAULT_ROTATION_SETTINGS.rotationRestockEnabled,
    rotationRestockCoverageDays:
        doc?.rotationRestockCoverageDays ?? DEFAULT_ROTATION_SETTINGS.rotationRestockCoverageDays,
});
