import { Schema, model, models } from "mongoose";

// Imágenes del carrusel de la home, editables desde /admin/hero
const HeroSlideSchema = new Schema(
    {
        image: { type: String, required: true, trim: true },
        title: { type: String, default: "", trim: true },
        subtitle: { type: String, default: "", trim: true },
        // Texto del botón que se muestra sobre la imagen (opcional)
        ctaLabel: { type: String, default: "", trim: true },
        // Ruta interna (/productos/...) o URL absoluta; vacío = banner sin vínculo
        href: { type: String, default: "", trim: true },
        openInNewTab: { type: Boolean, default: false },
        order: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
    },
    { timestamps: true },
);

export const HeroSlideModel =
    models.HeroSlide || model("HeroSlide", HeroSlideSchema, "hero_slides");
