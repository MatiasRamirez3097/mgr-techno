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

// Límites de los umbrales de "Stock a rotar" (el formulario usa los mismos)
export const ROTATION_LIMITS = {
    rotationSalesWindowDays: { min: 7, max: 730 },
    rotationSlowCoverageDays: { min: 1, max: 3650 },
    rotationOldStockDays: { min: 1, max: 3650 },
    rotationCheaperReplacementPercent: { min: 0, max: 100 },
    rotationCompetitorPercent: { min: 0, max: 100 },
    rotationRestockCoverageDays: { min: 1, max: 365 },
} as const;

const rotationNumber = (key: keyof typeof ROTATION_LIMITS, label: string, integer = true) => {
    const { min, max } = ROTATION_LIMITS[key];
    const base = z.number({ error: `${label}: completá un número` });
    return (integer ? base.int(`${label}: tiene que ser un número entero`) : base)
        .min(min, `${label}: mínimo ${min}`)
        .max(max, `${label}: máximo ${max}`);
};

export const rotationSettingsSchema = z.object({
    rotationSalesWindowDays: rotationNumber("rotationSalesWindowDays", "Ventana de ventas"),
    rotationSlowCoverageDays: rotationNumber("rotationSlowCoverageDays", "Stock lento"),
    rotationOldStockDays: rotationNumber("rotationOldStockDays", "Stock viejo"),
    rotationCheaperReplacementPercent: rotationNumber(
        "rotationCheaperReplacementPercent",
        "Reposición más barata",
        false,
    ),
    rotationCompetitorPercent: rotationNumber("rotationCompetitorPercent", "Competencia más barata", false),
    rotationRestockEnabled: z.boolean(),
    rotationRestockCoverageDays: rotationNumber("rotationRestockCoverageDays", "Reponer"),
});

export type PricingSettingsInput = z.infer<typeof pricingSettingsSchema>;
