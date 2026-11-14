import type { Types } from "mongoose";
import type { HeroSlideDTO } from "@/types/shared/heroSlide";

export interface HeroSlideDocument {
    _id: Types.ObjectId | string;
    image: string;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    href?: string;
    openInNewTab?: boolean;
    order?: number;
    active?: boolean;
}

export function mapHeroSlideToDTO(doc: HeroSlideDocument): HeroSlideDTO {
    return {
        id: doc._id.toString(),
        image: doc.image,
        title: doc.title || "",
        subtitle: doc.subtitle || "",
        ctaLabel: doc.ctaLabel || "",
        href: doc.href || "",
        openInNewTab: doc.openInNewTab ?? false,
        order: doc.order ?? 0,
        active: doc.active ?? true,
    };
}
