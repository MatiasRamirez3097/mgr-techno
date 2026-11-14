import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { HeroSlideModel } from "@/models/HeroSlide";
import { heroSlideSchema } from "@/lib/validators/heroSlideSchema";
import {
    mapHeroSlideToDTO,
    type HeroSlideDocument,
} from "@/lib/mappers/heroSlideMapper";
import type { HeroSlideDTO } from "@/types/shared/heroSlide";
import { revalidateHeroSlides } from "./revalidateHeroSlides";

/**
 * Crea (sin `id`) o actualiza un banner del hero.
 */
export async function saveHeroSlide(data: unknown, id?: string): Promise<HeroSlideDTO> {
    const parsed = heroSlideSchema.parse(data);

    if (id && !Types.ObjectId.isValid(id)) {
        throw new BusinessError("Banner no encontrado", 404);
    }

    await connectDB();

    const doc = id
        ? await HeroSlideModel.findByIdAndUpdate(
              id,
              { $set: parsed },
              { returnDocument: "after", runValidators: true },
          ).lean<HeroSlideDocument>()
        : (await HeroSlideModel.create(parsed)).toObject();

    if (!doc) {
        throw new BusinessError("Banner no encontrado", 404);
    }

    revalidateHeroSlides();
    return mapHeroSlideToDTO(doc as HeroSlideDocument);
}
