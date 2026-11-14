import type { HeroSlideInput } from "@/lib/validators/heroSlideSchema";

// Banners con los que se inicializa la colección la primera vez (antes estaban
// hardcodeados en HeroCarousel, sin el de "3 cuotas sin interés"). Después se
// editan desde /admin/hero.
export const DEFAULT_HERO_SLIDES: HeroSlideInput[] = [
    {
        image: "https://res.cloudinary.com/dunvoi8mr/image/upload/v1780436851/banner1_xaiuk2.jpg",
        title: "Componentes de PC",
        subtitle: "Las mejores marcas al mejor precio",
        ctaLabel: "Ver productos",
        href: "/productos/categoria/componentes-de-pc",
        openInNewTab: false,
        order: 10,
        active: true,
    },
    {
        image: "https://res.cloudinary.com/dunvoi8mr/image/upload/v1780436487/Mesa_de_trabajo_3_nhiiih.jpg",
        title: "Ofertas imperdibles",
        subtitle: "Descuentos en periféricos y más",
        ctaLabel: "Ver ofertas",
        href: "/productos/ofertas",
        openInNewTab: false,
        order: 20,
        active: true,
    },
    {
        image: "https://res.cloudinary.com/dunvoi8mr/image/upload/v1780436401/Mesa_de_trabajo_2_svrdnb.jpg",
        title: "Refrigeración",
        subtitle: "Mantené tu equipo al límite",
        ctaLabel: "Explorar",
        href: "/productos/categoria/refrigeracion",
        openInNewTab: false,
        order: 30,
        active: true,
    },
];
