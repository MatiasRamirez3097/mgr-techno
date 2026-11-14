import { HeroSlidesManager } from "@/components/admin/hero/HeroSlidesManager";
import { getHeroSlides } from "@/services/heroSlides/getHeroSlides";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
    const slides = await getHeroSlides();

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Banners de la home</h1>
                <p className="text-sm text-gray-400 mt-1">
                    Imágenes del carrusel principal de la tienda, en el orden en que se muestran.
                </p>
            </div>

            <HeroSlidesManager initialSlides={slides} />
        </div>
    );
}
