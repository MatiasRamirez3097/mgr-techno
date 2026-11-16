import { z } from "zod";

const optionalPercent = z
    .number()
    .min(0, "El margen no puede ser negativo")
    .max(1000)
    .nullable();

export const categoryMarginsSchema = z.object({
    categories: z
        .array(
            z
                .object({
                    id: z.string().min(1),
                    targetMarginPercent: optionalPercent,
                    minMarginPercent: optionalPercent,
                })
                .refine(
                    (c) =>
                        c.targetMarginPercent === null ||
                        c.minMarginPercent === null ||
                        c.minMarginPercent <= c.targetMarginPercent,
                    { message: "En una categoría el margen mínimo no puede ser mayor que el objetivo" },
                ),
        )
        .max(2000),
});

export const applyPricesSchema = z.object({
    updates: z
        .array(
            z.object({
                productId: z.string().min(1),
                price: z.number().positive("El precio debe ser mayor a 0"),
            }),
        )
        .min(1, "No hay precios para aplicar")
        .max(500, "Máximo 500 productos por vez"),
});
