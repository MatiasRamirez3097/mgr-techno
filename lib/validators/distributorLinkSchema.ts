import { z } from "zod";
import { toDistributorKey } from "@/lib/distributors/productLinks";

const nullableNumber = z.number().min(0).nullish().transform((v) => v ?? null);

export const createDistributorLinkSchema = z.object({
    distributor: z
        .string()
        .transform((value, ctx) => {
            const key = toDistributorKey(value);
            if (!key) {
                ctx.addIssue({ code: "custom", message: `Distribuidor desconocido: ${value}` });
                return z.NEVER;
            }
            return key;
        }),
    distributorProductId: z.coerce.string().trim().min(1, "Falta el ID del producto en el distribuidor"),
    distributorSku: z.string().trim().optional().default(""),
    name: z.string().trim().min(1, "Falta el nombre del producto en el distribuidor"),
    link: z.string().nullish().transform((v) => v || null),
    image: z.string().nullish().transform((v) => v || null),
    price: nullableNumber,
    stock: z.number().nullish().transform((v) => v ?? null),
    stockLabel: z.string().nullish().transform((v) => v || null),
    matchMethod: z.enum(["part_number", "ean", "manual"]).optional().default("manual"),
});

export type CreateDistributorLinkData = z.infer<typeof createDistributorLinkSchema>;
