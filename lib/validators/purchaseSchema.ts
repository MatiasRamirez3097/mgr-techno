import { z } from "zod";
import { Types } from "mongoose";

// Helper para validar ObjectId
const objectIdSchema = z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: "ID inválido" });

// Schema para el documento de compra
export const purchaseDocumentSchema = z.object({
    type: z.enum(["invoice", "generic"]).default("generic"),
    number: z.string().optional(),
    fileUrl: z.string().pipe(z.url()).optional(),
    fileName: z.string().optional(),
    date: z.coerce.date().optional(),
});

// Schema para item de compra
export const purchaseItemSchema = z.object({
    name: z.string(),
    productId: objectIdSchema,
    quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
    unitCost: z.number().min(0, "El costo unitario debe ser positivo"),
    taxRate: z.number().min(0).max(100).default(10.5),
    serialNumbers: z.array(z.string().min(1)).optional(),
    location: z.string().default("main"),
});

// Schema para crear compra
export const createPurchaseSchema = z.object({
    supplierId: objectIdSchema,
    items: z
        .array(purchaseItemSchema)
        .min(1, "Debe incluir al menos un producto"),
    document: purchaseDocumentSchema.default({ type: "generic" }),
    notes: z.string().optional(),
    status: z.enum(["draft", "confirmed"]).default("draft"),
    currency: z.enum(["ARS", "USD"]).default("ARS"),
    exchangeRate: z.number().min(0).optional().default(1),
});

// Schema para actualizar compra
export const updatePurchaseSchema = z.object({
    supplierId: objectIdSchema.optional(),
    items: z
        .array(purchaseItemSchema)
        .min(1, "Debe incluir al menos un producto")
        .optional(),
    document: purchaseDocumentSchema.optional(),
    notes: z.string().optional(),
    status: z.enum(["draft", "confirmed", "cancelled"]).optional(),
    currency: z.enum(["ARS", "USD"]).optional(),
    exchangeRate: z.number().min(0).optional(),
});

// Schema para recepcionar compra (lo que envía ReceivePurchaseForm)
export const receivePurchaseItemSchema = z.object({
    productId: objectIdSchema,
    quantity: z.number().int().min(0, "La cantidad debe ser mayor o igual a 0"),
    serials: z.array(z.string().trim()).optional(),
    defects: z.array(z.string().trim()).optional(),
});

export const receivePurchaseBodySchema = z.object({
    items: z
        .array(receivePurchaseItemSchema)
        .min(1, "Debe incluir al menos un producto"),
});

// Schema para actualizar documento de compra
export const updatePurchaseDocumentSchema = z.object({
    purchaseId: objectIdSchema,
    document: purchaseDocumentSchema,
});

// Types inferidos
export type PurchaseDocumentInput = z.infer<typeof purchaseDocumentSchema>;
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type ReceivePurchaseItemInput = z.infer<typeof receivePurchaseItemSchema>;
export type ReceivePurchaseBodyInput = z.infer<typeof receivePurchaseBodySchema>;
export type UpdatePurchaseDocumentInput = z.infer<
    typeof updatePurchaseDocumentSchema
>;
