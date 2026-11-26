import { z } from "zod";

const uuid = z.string().regex(/^[a-z0-9-]{8,64}$/i, "ID inválido");
const shortText = z.string().max(300).nullish();

export const TRACK_EVENT_TYPES = ["page_view", "product_view", "add_to_cart", "search"] as const;
export type TrackEventType = (typeof TRACK_EVENT_TYPES)[number];

/** Evento que manda el navegador a /api/track. */
export const trackEventSchema = z
    .object({
        type: z.enum(TRACK_EVENT_TYPES),
        visitorId: uuid,
        sessionId: uuid,
        path: z.string().min(1).max(500).startsWith("/"),
        search: z.string().max(1000).optional().default(""),
        productId: z
            .string()
            .regex(/^[a-f\d]{24}$/i, "ID inválido")
            .optional(),
        // Búsqueda de la tienda: lo que se escribió y cuántos productos con stock encontró
        query: z.string().max(200).optional(),
        results: z.number().int().min(0).max(1_000_000).optional(),
        // Cómo llegó la visita: se usa sólo al crear la sesión
        entry: z
            .object({
                referrer: z.string().max(1000).nullish(),
                utmSource: shortText,
                utmMedium: shortText,
                utmCampaign: shortText,
                gclid: z.boolean().optional(),
                fbclid: z.boolean().optional(),
            })
            .nullish(),
    })
    .refine((e) => !["product_view", "add_to_cart"].includes(e.type) || Boolean(e.productId), {
        message: "Falta el producto",
        path: ["productId"],
    })
    .refine((e) => e.type !== "search" || (Boolean(e.query?.trim()) && e.results !== undefined), {
        message: "Falta la búsqueda",
        path: ["query"],
    });

export type TrackEventInput = z.infer<typeof trackEventSchema>;
