import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { HeroSlideModel } from "@/models/HeroSlide";
import { heroSlidesReorderSchema } from "@/lib/validators/heroSlideSchema";
import { revalidateHeroSlides } from "./revalidateHeroSlides";

/**
 * Reasigna el orden de los banners según la posición de cada id en la lista (10, 20, 30...).
 */
export async function reorderHeroSlides(data: unknown): Promise<void> {
    const { ids } = heroSlidesReorderSchema.parse(data);

    if (ids.some((id) => !Types.ObjectId.isValid(id))) {
        throw new BusinessError("Banner no encontrado", 404);
    }

    await connectDB();

    await HeroSlideModel.bulkWrite(
        ids.map((id, i) => ({
            updateOne: {
                filter: { _id: new Types.ObjectId(id) },
                update: { $set: { order: (i + 1) * 10 } },
            },
        })),
    );

    revalidateHeroSlides();
}
