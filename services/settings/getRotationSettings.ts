import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import {
    mapRotationSettingsToDTO,
    ROTATION_SETTINGS_FIELDS,
    type RotationSettingsDoc,
} from "@/lib/mappers/rotationSettingsMapper";
import type { RotationSettingsDTO } from "@/types/shared/stockRotation";

/** Umbrales de "Stock a rotar". Separado de getStoreSettings, que llega a la tienda pública. */
export async function getRotationSettings(): Promise<RotationSettingsDTO> {
    await connectDB();
    const projection = Object.fromEntries(ROTATION_SETTINGS_FIELDS.map((f) => [f, 1]));
    const doc = await StoreSettingsModel.findById("store", projection).lean<RotationSettingsDoc>();
    return mapRotationSettingsToDTO(doc);
}
