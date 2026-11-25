import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import {
    mapStockCountSettingsToDTO,
    STOCK_COUNT_SETTINGS_FIELDS,
    type StockCountSettingsDoc,
} from "@/lib/mappers/stockCountMapper";
import type { StockCountSettingsDTO } from "@/types/shared/stockCount";

/** Configuración del conteo rotativo. Separado de getStoreSettings, que llega a la tienda pública. */
export async function getStockCountSettings(): Promise<StockCountSettingsDTO> {
    await connectDB();
    const projection = Object.fromEntries(STOCK_COUNT_SETTINGS_FIELDS.map((f) => [f, 1]));
    const doc = await StoreSettingsModel.findById("store", projection).lean<StockCountSettingsDoc>();
    return mapStockCountSettingsToDTO(doc);
}
