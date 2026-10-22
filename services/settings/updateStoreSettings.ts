import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { storeSettingsSchema } from "@/lib/validators/storeSettingsSchema";
import { revalidateProductsCache } from "@/services/products/getCatalogProducts";
import type { StoreSettingsDTO } from "@/types/shared/settings";

export async function updateStoreSettings(
    data: unknown,
): Promise<StoreSettingsDTO> {
    const parsed = storeSettingsSchema.parse(data);

    await connectDB();

    const settings = await StoreSettingsModel.findByIdAndUpdate(
        "store",
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<StoreSettingsDTO>();

    // Los precios con recargo se muestran en catálogo y fichas
    revalidateProductsCache();

    return {
        mercadoPagoSurchargePercent: settings!.mercadoPagoSurchargePercent,
    };
}
