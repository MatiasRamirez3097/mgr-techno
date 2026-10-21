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

    bundleItems: z
        .array(
            z.object({
                productId: z.string(),
                quantity: z.number().min(1),
            }),
        )
        .optional(),

    attributes: z
        .array(
            z.object({
                key: z.string(),
                label: z.string(),
                value: z.any(),
                unit: z.string().optional(),
            }),
        )
        .optional(),

    hasFreeShipping: z.boolean().optional().default(false),
    shippingSize: z
        .enum(["small", "standard", "bulky"])
        .optional()
        .default("standard"),
});

export const productSchema = createProductSchema.superRefine(
    (data, ctx) => {
        // 🔴 simple
        if (
            data.type === "simple" &&
            data.salePrice &&
            data.regularPrice &&
            data.salePrice >= data.regularPrice
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El precio de oferta debe ser menor al precio regular",
                path: ["salePrice"],
            });
        }

        // 🔴 bundle
        if (data.type === "bundle") {
            if (!data.bundleItems || data.bundleItems.length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Un combo debe contener al menos un producto componente",
                    path: ["bundleItems"],
                });
            }
            if (data.salePrice == null || data.salePrice <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El precio de oferta es obligatorio para los productos tipo combo",
                    path: ["salePrice"],
                });
            }
        }
    },
);

export const createProductSchemaRefined = productSchema;

export type CreateProductDTO = z.infer<typeof createProductSchema>;

export const createQuickProductSchema = z.object({
    name: z.string().trim().min(1, "El nombre del producto es obligatorio"),
    sku: z.string().trim().optional().nullable(),
    brand: z.string().trim().optional().nullable(),
    categoryId: z.string().trim().optional().nullable(),
    hasSerialNumber: z.boolean().default(false),
    taxRate: z.number().default(10.5),
    costPrice: z.number().min(0).default(0),
    regularPrice: z.number().min(0).optional(),
});

export type CreateQuickProductDTO = z.infer<typeof createQuickProductSchema>;
