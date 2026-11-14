import { connectDB } from "@/lib/mongodb";
import { getNextSequence } from "@/lib/counters/getNextGenericNumber";
import { HeroSlideModel } from "@/models/HeroSlide";
import { DEFAULT_HERO_SLIDES } from "@/lib/heroSlides/heroSlideDefaults";
import {
    mapHeroSlideToDTO,
    type HeroSlideDocument,
} from "@/lib/mappers/heroSlideMapper";
import type { HeroSlideDTO } from "@/types/shared/heroSlide";

// Carga los banners históricos una única vez. El contador evita volver a cargarlos
// si después se borran todos, y que dos instancias los inserten en paralelo.
async function seedOnce() {
    if ((await HeroSlideModel.estimatedDocumentCount()) > 0) return;
    if ((await getNextSequence("hero_slides_seed")) !== 1) return;
    await HeroSlideModel.insertMany(DEFAULT_HERO_SLIDES);
}

export async function getHeroSlides({
    activeOnly = false,
}: { activeOnly?: boolean } = {}): Promise<HeroSlideDTO[]> {
    await connectDB();
    await seedOnce();

    const docs = await HeroSlideModel.find(activeOnly ? { active: true } : {})
        .sort({ order: 1, createdAt: 1 })
        .lean<HeroSlideDocument[]>();

    return docs.map(mapHeroSlideToDTO);
}
