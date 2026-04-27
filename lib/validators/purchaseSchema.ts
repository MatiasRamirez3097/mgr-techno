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
    date: z.coerce.date().optional(), // coerce convierte string a Date automáticamente
});

// Schema para item de compra
export const purchaseItemSchema = z.object({
    productId: objectIdSchema,
    quantity: z.number().int().min(1, "La cantidad debe ser al menos 1"),
    unitCost: z.number().min(0, "El costo unitario debe ser positivo"),
    serialNumbers: z.array(z.string().min(1)).optional(),
    location: z.string().default("main"),
});

// Schema para crear compra
export const createPurchaseSchema = z.object({
    supplierId: objectIdSchema,
    items: z
        .array(purchaseItemSchema)
        .min(1, "Debe incluir al menos un producto"),
    document: purchaseDocumentSchema.optional().default({}),
    notes: z.string().optional(),
    status: z.string(),
    /*orderDate: z.coerce
        .date()
        .optional()
        .default(() => new Date()),*/
});

// Schema para recibir items
export const receiveItemSchema = z.object({
    productId: objectIdSchema,
    quantityReceived: z.number().int().min(1, "Debe recibir al menos 1 unidad"),
    serialNumbers: z.array(z.string().min(1)).optional(),
    location: z.string().default("main"),
});

export const receivePurchaseSchema = z.object({
    purchaseId: objectIdSchema,
    receivedItems: z
        .array(receiveItemSchema)
        .min(1, "Debe recibir al menos un item"),
    // Opcional: actualizar documento al recibir
    document: purchaseDocumentSchema.optional(),
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
export type ReceiveItemInput = z.infer<typeof receiveItemSchema>;
export type ReceivePurchaseInput = z.infer<typeof receivePurchaseSchema>;
export type UpdatePurchaseDocumentInput = z.infer<
    typeof updatePurchaseDocumentSchema
>;
