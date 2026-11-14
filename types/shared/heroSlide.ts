// Imagen del carrusel de la home
export interface HeroSlideDTO {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    href: string;
    openInNewTab: boolean;
    order: number;
    active: boolean;
}
