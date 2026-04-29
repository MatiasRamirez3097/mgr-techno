import { z } from "zod";

export const createProductSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),

    slug: z.string().min(1, "El slug es obligatorio").optional(),

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

    stockQuantity: z.number().int().min(0).optional(),

    stockStatus: z
        .enum(["instock", "outofstock", "onbackorder"])
        .default("instock"),

    shortDescription: z.string().max(160).optional(),
    description: z.string().optional(),

    weight: z.number().positive().optional(),

    dimensions: z
        .object({
            length: z.number().positive().optional(),
            width: z.number().positive().optional(),
            height: z.number().positive().optional(),
        })
        .optional(),

    categories: z.array(z.string()).optional(), // vienen como string del front

    featured: z.boolean().optional().default(false),

    status: z.enum(["publish", "draft", "private"]).default("publish"),

    sku: z.string().min(3).optional(),

    bundleItemsCount: z.number().int().min(0).optional(),
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

        // 🔴 stock si manageStock
        if (data.manageStock) {
            if (data.stockQuantity == null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Debe indicar el stock",
                    path: ["stockQuantity"],
                });
            }
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
