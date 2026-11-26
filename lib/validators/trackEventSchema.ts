import { z } from "zod";

const uuid = z.string().regex(/^[a-z0-9-]{8,64}$/i, "ID inválido");
const shortText = z.string().max(300).nullish();

export const TRACK_EVENT_TYPES = ["page_view", "product_view", "add_to_cart"] as const;
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
    .refine((e) => e.type === "page_view" || Boolean(e.productId), {
        message: "Falta el producto",
        path: ["productId"],
    });

export type TrackEventInput = z.infer<typeof trackEventSchema>;
