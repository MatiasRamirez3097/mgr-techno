import { z } from "zod";
import { REFERENCE_SOURCE_KEYS } from "@/lib/priceReference/sources";

const sourceKey = z.string().refine((v) => REFERENCE_SOURCE_KEYS.includes(v), {
    message: "Fuente desconocida",
});
const url = z.string().url().max(1000);
const text = (max: number) => z.string().max(max);

const productData = z.object({
    name: text(500).min(1),
    sku: text(200),
    gtin: text(50),
    brand: text(200),
    image: z.string().max(1000).nullable(),
    price: z.number().positive(),
    listPrice: z.number().positive(),
    currency: text(10),
    inStock: z.boolean(),
    categoryPath: z.array(text(200)).max(10),
});

// Lo que sube la tarea de la PC (tools/price-reference-upload) en cada paso de la pasada
export const priceReferenceUploadSchema = z.discriminatedUnion("action", [
    z.object({
        action: z.literal("sitemap"),
        source: sourceKey,
        entries: z
            .array(z.object({ loc: url, lastmod: z.coerce.date().nullable() }))
            .min(1)
            .max(50_000),
    }),
    z.object({
        action: z.literal("pages"),
        source: sourceKey,
        outcomes: z
            .array(
                z.discriminatedUnion("status", [
                    z.object({ url, status: z.literal("ok"), data: productData }),
                    z.object({ url, status: z.literal("not_found") }),
                    z.object({ url, status: z.literal("error"), message: text(1000) }),
                ]),
            )
            .max(200),
    }),
    // Fuentes catalog-json: tandas del catálogo completo, todas con el mismo seenAt
    z.object({
        action: z.literal("catalog"),
        source: sourceKey,
        seenAt: z.coerce.date(),
        entries: z
            .array(z.object({ externalId: text(100).min(1), url, data: productData }))
            .min(1)
            .max(1000),
    }),
    z.object({
        action: z.literal("catalog-finish"),
        source: sourceKey,
        seenAt: z.coerce.date(),
        total: z.number().int().min(0),
    }),
    z.object({
        action: z.literal("finish"),
        source: sourceKey,
        summary: z.object({
            status: z.enum(["ok", "partial", "error"]),
            fetched: z.number().int().min(0),
            message: text(1000).nullable().optional(),
        }),
    }),
]);
