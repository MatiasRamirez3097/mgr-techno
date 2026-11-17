import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import type { DistributorSettingsDTO } from "@/types/shared/settings";

export type DistributorSettingsDoc = Partial<DistributorSettingsDTO>;

export const mapDistributorSettings = (doc: DistributorSettingsDoc | null): DistributorSettingsDTO => ({
    pcmoddApplyIva: doc?.pcmoddApplyIva ?? true,
});

/**
 * Configuración de distribuidores. Va separada de getStoreSettings porque ese se envía al
 * navegador en la tienda pública.
 */
export async function getDistributorSettings(): Promise<DistributorSettingsDTO> {
    await connectDB();
    const doc = await StoreSettingsModel.findById("store", { pcmoddApplyIva: 1 }).lean<DistributorSettingsDoc>();
    return mapDistributorSettings(doc);
}
