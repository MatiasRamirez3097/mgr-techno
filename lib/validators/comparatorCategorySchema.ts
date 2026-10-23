import { z } from "zod";

const cleanList = (values: string[]) => [
    ...new Set(values.map((v) => v.trim()).filter(Boolean)),
];

export const comparatorCategorySchema = z.object({
    key: z
        .string()
        .trim()
        .min(1, "La clave es obligatoria")
        .max(40)
        .transform((v) => v.toUpperCase())
        .refine((v) => /^[A-Z0-9-]+$/.test(v), {
            message: "La clave sólo admite letras, números y guiones",
        }),
    name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
    order: z.number().int().min(0).default(0),
    active: z.boolean().default(true),
    elit: z
        .array(
            z.object({
                paramType: z.enum(["categoria", "sub_categoria"]),
                value: z.string().trim().min(1),
            }),
        )
        .default([])
        // Sin duplicados del mismo tipo y valor
        .transform((items) =>
            items.filter(
                (item, i) =>
                    items.findIndex(
                        (o) =>
                            o.paramType === item.paramType &&
                            o.value.toLowerCase() === item.value.toLowerCase(),
                    ) === i,
            ),
        ),
    newbytes: z.array(z.string()).default([]).transform(cleanList),
    invid: z.array(z.string()).default([]).transform(cleanList),
});

export type ComparatorCategoryInput = z.infer<typeof comparatorCategorySchema>;
