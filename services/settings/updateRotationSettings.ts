import { connectDB } from "@/lib/mongodb";
import { StoreSettingsModel } from "@/models/StoreSettings";
import { rotationSettingsSchema } from "@/lib/validators/storeSettingsSchema";
import type { RotationSettingsDTO } from "@/types/shared/stockRotation";
import { mapRotationSettingsToDTO, type RotationSettingsDoc } from "@/lib/mappers/rotationSettingsMapper";

export async function updateRotationSettings(data: unknown): Promise<RotationSettingsDTO> {
    const parsed = rotationSettingsSchema.parse(data);
    await connectDB();
    const doc = await StoreSettingsModel.findByIdAndUpdate(
        "store",
        { $set: parsed },
        { upsert: true, returnDocument: "after", runValidators: true },
    ).lean<RotationSettingsDoc>();
    return mapRotationSettingsToDTO(doc);
}
