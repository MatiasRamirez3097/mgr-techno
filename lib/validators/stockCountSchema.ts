import { z } from "zod";
import { STOCK_COUNT_LIMITS } from "@/lib/inventory/stockCount";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

const limitedInt = (key: keyof typeof STOCK_COUNT_LIMITS, label: string) => {
    const { min, max } = STOCK_COUNT_LIMITS[key];
    return z
        .number({ error: `${label}: completá un número` })
        .int(`${label}: tiene que ser un número entero`)
        .min(min, `${label}: mínimo ${min}`)
        .max(max, `${label}: máximo ${max}`);
};

export const stockCountSettingsSchema = z.object({
    stockCountDailyProducts: limitedInt("stockCountDailyProducts", "Productos por día"),
    stockCountRepeatDays: limitedInt("stockCountRepeatDays", "Días hasta volver a contar"),
    stockCountNotifyEnabled: z.boolean().default(true),
});

export const recordStockCountSchema = z.object({
    productId: objectId,
    counted: z
        .number({ error: "Completá cuántas unidades contaste" })
        .int("La cantidad tiene que ser un número entero")
        .min(0, "La cantidad no puede ser negativa")
        .max(100_000),
    notes: z.string().trim().max(500).default(""),
});

export const resolveStockCountSchema = z
    .object({
        action: z.enum(["adjust", "pending_sale", "dismiss"]),
        reason: z.enum(["damaged", "lost", "data_error", "found", "other"]).nullable().default(null),
        notes: z.string().trim().max(500).default(""),
    })
    .refine((r) => r.action !== "adjust" || r.reason !== null, {
        message: "Elegí el motivo del ajuste",
        path: ["reason"],
    });
