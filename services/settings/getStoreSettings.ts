import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { DEFAULT_MP_SURCHARGE_PERCENT } from "@/lib/pricing";
import type { StoreSettingsDTO } from "@/types/shared/settings";

const SETTINGS_ID = "store";

/**
 * Lee la configuración de la tienda directo de la DB (sin caché),
 * para que los precios cobrados siempre usen el valor vigente.
 */
export async function getStoreSettings(): Promise<StoreSettingsDTO> {
    await connectDB();

    const settings = await StoreSettingsModel.findById(SETTINGS_ID).lean<{
        mercadoPagoSurchargePercent?: number;
    }>();

    return {
        mercadoPagoSurchargePercent:
            settings?.mercadoPagoSurchargePercent ??
            DEFAULT_MP_SURCHARGE_PERCENT,
    };
}
