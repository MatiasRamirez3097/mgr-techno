import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const createPendingSaleSchema = z.object({
    productId: objectId,
    quantity: z.number().int().min(1).max(100),
    scannedCode: z.string().trim().max(64).optional().default(""),
    notes: z.string().trim().max(500).optional().default(""),
});

export const assignProductCodeSchema = z.object({
    productId: objectId,
    field: z.enum(["gtin", "sku", "mpn"]),
    code: z.string().trim().min(1).max(64),
});

export type CreatePendingSaleInput = z.infer<typeof createPendingSaleSchema>;
export type AssignProductCodeInput = z.infer<typeof assignProductCodeSchema>;
