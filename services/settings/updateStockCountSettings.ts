import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { stockCountSettingsSchema } from "@/lib/validators/stockCountSchema";
import { mapStockCountSettingsToDTO, type StockCountSettingsDoc } from "@/lib/mappers/stockCountMapper";
import type { StockCountSettingsDTO } from "@/types/shared/stockCount";

export async function updateStockCountSettings(data: unknown): Promise<StockCountSettingsDTO> {
    const parsed = stockCountSettingsSchema.parse(data);
    await connectDB();
    const doc = await StoreSettingsModel.findByIdAndUpdate(
        "store",
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<StockCountSettingsDoc>();
    return mapStockCountSettingsToDTO(doc);
}
