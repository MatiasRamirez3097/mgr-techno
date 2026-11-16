import { HeroSlidesManager } from "@/components/admin/hero/HeroSlidesManager";
import { getHeroSlides } from "@/services/heroSlides/getHeroSlides";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminHeroPage() {
    const slides = await getHeroSlides();

    return (
        <div>
            <AdminPageHeader
                title="Banners de la home"
                description="Imágenes del carrusel principal de la tienda, en el orden en que se muestran."
            />

            <HeroSlidesManager initialSlides={slides} />
        </div>
    );
}
