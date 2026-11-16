import { z } from "zod";
import type { QuoteItemDTO } from "@/types/shared/quote";

const originSchema = z.enum(["internal", "distributor", "manual"]);
const optionalNumber = z.number().nullish().transform((v) => v ?? undefined);
const optionalString = z.string().nullish().transform((v) => v || undefined);

export const quoteComponentSchema = z.object({
    origin: originSchema.default("internal"),
    productId: optionalString,
    distributor: optionalString,
    distributorSku: optionalString,
    name: z.string().trim().min(1, "Todos los componentes de la PC Armada deben tener nombre"),
    sku: z.string().optional().default(""),
    image: optionalString,
    quantity: z.coerce.number().int().min(1),
    costPrice: z.coerce.number().min(0).optional().default(0),
    costPriceUsd: optionalNumber,
    costExchangeRate: optionalNumber,
    alertAckPriceUsd: optionalNumber,
    alertAckExchangeRate: optionalNumber,
    unitPrice: z.coerce.number().min(0).optional().default(0),
    taxRate: z.coerce.number().min(0).max(100).optional().default(10.5),
});

// Sólo se validan a fondo los campos de la PC Armada; el resto del ítem se conserva tal cual
export const quoteItemSchema = z
    .looseObject({
        name: z.string().trim().min(1, "Todos los ítems deben tener un nombre o descripción"),
        isCustomPc: z.boolean().optional().default(false),
        components: z.array(quoteComponentSchema).optional().default([]),
    })
    .superRefine((item, ctx) => {
        if (item.isCustomPc && item.components.length === 0) {
            ctx.addIssue({
                code: "custom",
                message: `La PC Armada "${item.name}" debe tener al menos un componente`,
                path: ["components"],
            });
        }
    })
    .transform((item) => ({
        ...item,
        // Un ítem común no lleva componentes
        components: item.isCustomPc ? item.components : [],
    }));

export const quoteItemsSchema = z.array(quoteItemSchema);

/** Valida y normaliza los ítems de un presupuesto; lanza con el primer error legible. */
export function parseQuoteItems(items: unknown): Omit<QuoteItemDTO, "subtotal">[] {
    const result = quoteItemsSchema.safeParse(items);
    if (!result.success) {
        throw new Error(result.error.issues[0]?.message || "Ítems del presupuesto inválidos");
    }
    return result.data as unknown as Omit<QuoteItemDTO, "subtotal">[];
}
