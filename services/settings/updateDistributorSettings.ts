import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { distributorSettingsSchema } from "@/lib/validators/storeSettingsSchema";
import { recalculatePcmoddPrices } from "@/services/distributors/pcmodd/recalculatePcmoddPrices";
import type { DistributorSettingsDTO } from "@/types/shared/settings";
import { getDistributorSettings, mapDistributorSettings, type DistributorSettingsDoc } from "./getDistributorSettings";

/**
 * Guarda la configuración de distribuidores. Si cambia cómo se toma el IVA de PCMODD, recalcula
 * en el momento los costos ya cargados (sin esperar a la próxima lectura de la hoja).
 */
export async function updateDistributorSettings(
    data: unknown,
): Promise<DistributorSettingsDTO & { recalculated: number | null }> {
    const parsed = distributorSettingsSchema.parse(data);
    const previous = await getDistributorSettings();

    await connectDB();
    const doc = await StoreSettingsModel.findByIdAndUpdate(
        "store",
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<DistributorSettingsDoc>();
    const settings = mapDistributorSettings(doc);

    const recalculated =
        previous.pcmoddApplyIva !== settings.pcmoddApplyIva
            ? await recalculatePcmoddPrices(settings.pcmoddApplyIva)
            : null;
    return { ...settings, recalculated };
}
