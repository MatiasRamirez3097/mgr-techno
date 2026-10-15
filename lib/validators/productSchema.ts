import { z } from "zod";

export const createProductSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),

    slug: z.string().min(1, "El slug es obligatorio").optional(),

    brand: z.string().optional().nullable(),

    type: z.enum(["simple", "bundle"]).default("simple"),

    regularPrice: z
        .number({ error: "Precio inválido" })
        .positive("El precio debe ser mayor a 0"),

    salePrice: z
        .number()
        .positive("El precio de oferta debe ser mayor a 0")
        .optional()
        .nullable(),

    taxRate: z.number().optional(),

    image: z.string().optional(),
    images: z.array(z.string().optional()),
    hasSerialNumber: z.boolean().optional().default(false),
    manageStock: z.boolean().optional().default(true),

    shortDescription: z.string().max(2000).optional().nullable(),
    description: z.string().optional().nullable(),

    weight: z.number().nonnegative().optional().nullable(),

    dimensions: z
        .object({
            length: z.number().nonnegative().optional().nullable(),
            width: z.number().nonnegative().optional().nullable(),
            height: z.number().nonnegative().optional().nullable(),
        })
        .optional()
        .nullable(),

    categories: z.array(z.string()).optional(), // vienen como string del front

    featured: z.boolean().optional().default(false),

    status: z
        .enum(["publish", "draft", "private", "pending_review"])
        .default("publish"),

    sku: z.string().optional().nullable(),
    mpn: z.string().optional().nullable(),
    gtin: z.string().optional().nullable(),

    bundleItemsCount: z.number().int().min(0).optional().nullable(),
    hasFreeShipping: z.boolean().optional().nullable(),
    shippingSize: z.enum(["small", "standard", "bulky"]).optional().nullable(),
});

export const createProductSchemaRefined = createProductSchema.superRefine(
    (data, ctx) => {
        // 🔴 salePrice < regularPrice
        if (data.salePrice != null && data.salePrice >= data.regularPrice) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El precio de oferta debe ser menor al precio regular",
                path: ["salePrice"],
            });
        }

        // 🔴 bundle
        if (data.type === "bundle") {
            if (!data.bundleItemsCount || data.bundleItemsCount <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Bundle inválido",
                    path: ["bundleItemsCount"],
                });
            }
        }
    },
);

export type CreateProductDTO = z.infer<typeof createProductSchema>;
