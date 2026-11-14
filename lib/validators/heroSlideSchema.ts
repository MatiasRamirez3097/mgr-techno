import { z } from "zod";

export const heroSlideSchema = z.object({
    image: z
        .string()
        .trim()
        .min(1, "La imagen es obligatoria")
        .refine((v) => /^https:\/\//.test(v), {
            message: "La imagen debe ser una URL https",
        }),
    title: z.string().trim().max(120).default(""),
    subtitle: z.string().trim().max(200).default(""),
    ctaLabel: z.string().trim().max(40).default(""),
    href: z
        .string()
        .trim()
        .max(500)
        .default("")
        .refine((v) => !v || /^\/(?!\/)/.test(v) || /^https?:\/\//.test(v), {
            message: "El vínculo debe empezar con / (página de la tienda) o con http(s)://",
        }),
    openInNewTab: z.boolean().default(false),
    order: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
});

export type HeroSlideInput = z.infer<typeof heroSlideSchema>;

export const heroSlidesReorderSchema = z.object({
    ids: z.array(z.string()).min(1),
});
