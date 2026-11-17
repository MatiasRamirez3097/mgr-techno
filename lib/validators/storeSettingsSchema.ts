import { z } from "zod";

export const storeSettingsSchema = z.object({
    mercadoPagoSurchargePercent: z.number().min(0).max(100),
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;

export const distributorSettingsSchema = z.object({
    pcmoddApplyIva: z.boolean(),
});

export const pricingSettingsSchema = z
    .object({
        targetMarginPercent: z.number().min(0).max(1000),
        minMarginPercent: z.number().min(0).max(1000),
        priceRoundingStep: z.number().int().min(1).max(100000),
    })
    .refine((s) => s.minMarginPercent <= s.targetMarginPercent, {
        message: "El margen mínimo no puede ser mayor que el objetivo",
        path: ["minMarginPercent"],
    });

export type PricingSettingsInput = z.infer<typeof pricingSettingsSchema>;
