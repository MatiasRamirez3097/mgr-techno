import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { HeroSlideModel } from "@/models/HeroSlide";
import { revalidateHeroSlides } from "./revalidateHeroSlides";

// Sólo borra el registro: la imagen queda en Cloudinary (se puede reutilizar desde la biblioteca)
export async function deleteHeroSlide(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
        throw new BusinessError("Banner no encontrado", 404);
    }

    await connectDB();

    const deleted = await HeroSlideModel.findByIdAndDelete(id);
    if (!deleted) {
        throw new BusinessError("Banner no encontrado", 404);
    }

    revalidateHeroSlides();
}
