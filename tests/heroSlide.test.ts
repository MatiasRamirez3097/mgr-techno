import { describe, expect, it } from "vitest";
import { heroSlideSchema } from "@/lib/validators/heroSlideSchema";
import { DEFAULT_HERO_SLIDES } from "@/lib/heroSlides/heroSlideDefaults";

const IMAGE = "https://res.cloudinary.com/demo/image/upload/banner.jpg";

describe("heroSlideSchema", () => {
    it("completa los campos opcionales con valores por defecto", () => {
        const parsed = heroSlideSchema.parse({ image: IMAGE });
        expect(parsed).toEqual({
            image: IMAGE,
            title: "",
            subtitle: "",
            ctaLabel: "",
            href: "",
            openInNewTab: false,
            order: 0,
            active: true,
        });
    });

    it("exige la imagen", () => {
        expect(() => heroSlideSchema.parse({ image: "  " })).toThrow();
    });

    it("acepta rutas internas y URLs absolutas como vínculo", () => {
        for (const href of ["/productos/ofertas", "https://wa.me/123", "http://ejemplo.com"]) {
            expect(heroSlideSchema.parse({ image: IMAGE, href }).href).toBe(href);
        }
    });

    it("rechaza vínculos que no son rutas ni URLs http(s)", () => {
        for (const href of ["javascript:alert(1)", "//evil.com", "productos"]) {
            expect(() => heroSlideSchema.parse({ image: IMAGE, href })).toThrow();
        }
    });

    it("los banners por defecto son válidos y no incluyen el de cuotas sin interés", () => {
        for (const slide of DEFAULT_HERO_SLIDES) {
            expect(() => heroSlideSchema.parse(slide)).not.toThrow();
        }
        expect(DEFAULT_HERO_SLIDES.some((s) => /cuotas/i.test(s.title))).toBe(false);
    });
});
