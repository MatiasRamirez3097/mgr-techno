import { z } from "zod";
import { DISTRIBUTOR_KEYS } from "@/types/shared/distributorLink";
import { marginAfterDiscount, sortDiscountTiers } from "@/lib/dailyDeals/selection";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const dailyDealGroupSchema = z.object({
    id: z.string().trim().min(1).max(40),
    name: z.string().trim().min(1, "Cada grupo necesita un nombre").max(60),
    distributors: z.array(z.enum(DISTRIBUTOR_KEYS)).max(DISTRIBUTOR_KEYS.length),
    categoryIds: z.array(objectId).max(50),
    brandIds: z.array(objectId).max(50),
    onlyRotation: z.boolean().default(false),
    maxProducts: z.number().int().min(1, "El cupo de un grupo tiene que ser al menos 1").max(50).nullable(),
});

export const dailyDealDiscountTierSchema = z
    .object({
        minMarginPercent: z.number().min(0, "La utilidad mínima no puede ser negativa").max(500),
        discountPercent: z.number().min(1, "El descuento tiene que ser de al menos 1%").max(90),
    })
    // El peor caso de un escalón es un producto que justo llega a su utilidad mínima
    .refine((t) => marginAfterDiscount(t.minMarginPercent, t.discountPercent) >= 0, {
        message: "Con esa utilidad mínima y ese descuento, un producto podría quedar por debajo del costo",
        path: ["discountPercent"],
    });

export const dailyDealSettingsSchema = z
    .object({
        enabled: z.boolean(),
        productCount: z.number().int().min(1, "Tiene que haber al menos 1 producto").max(50),
        noRepeatDays: z.number().int().min(0).max(60),
        discountTiers: z
            .array(dailyDealDiscountTierSchema)
            .min(1, "Tiene que haber al menos un escalón de descuento")
            .max(10)
            .refine((tiers) => new Set(tiers.map((t) => t.minMarginPercent)).size === tiers.length, {
                message: "Hay dos escalones con la misma utilidad mínima",
            })
            .transform(sortDiscountTiers),
        requireDistributorStock: z.boolean(),
        startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida")
            .nullable()
            .default(null),
        groups: z.array(dailyDealGroupSchema).max(10),
        prioritizeRotation: z.boolean().default(false),
    })
    .refine((s) => new Set(s.groups.map((g) => g.id)).size === s.groups.length, {
        message: "Hay grupos repetidos",
        path: ["groups"],
    });

export type DailyDealSettingsInput = z.infer<typeof dailyDealSettingsSchema>;
