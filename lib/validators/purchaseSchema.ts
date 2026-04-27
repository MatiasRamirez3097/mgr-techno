import { z } from "zod";

export const purchaseItemSchema = z.object({
    productId: z.string().min(1, "Producto requerido"),

    name: z.string().min(1),

    quantity: z
        .number()
        .int("Cantidad inválida")
        .positive("Debe ser mayor a 0"),

    unitCost: z.number().positive("Costo inválido"),

    subtotal: z.number().min(0),
});

export const purchaseDocumentSchema = z.object({
    type: z.string().optional(), // factura, remito, etc
    number: z.string().optional(),
    date: z.string().datetime().optional(),
});

export const createPurchaseSchema = z.object({
    supplierId: z.string().min(1, "Proveedor requerido"),

    supplierName: z.string().optional(),

    status: z
        .enum(["draft", "confirmed", "received", "cancelled"])
        .default("draft"),

    items: z.array(purchaseItemSchema).min(1, "Debe tener al menos un item"),

    document: purchaseDocumentSchema.optional(),

    subtotal: z.number().min(0),
    tax: z.number().min(0).optional().default(0),
    total: z.number().min(0),

    notes: z.string().optional(),

    receivedAt: z.string().datetime().optional().nullable(),
});

export const createPurchaseSchemaRefined = createPurchaseSchema.superRefine(
    (data, ctx) => {
        // 🧮 validar subtotal vs items
        const calculatedSubtotal = data.items.reduce(
            (acc, item) => acc + item.unitCost * item.quantity,
            0,
        );

        if (Math.abs(calculatedSubtotal - data.subtotal) > 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El subtotal no coincide con los items",
                path: ["subtotal"],
            });
        }

        // 🧮 validar total
        const expectedTotal = data.subtotal + (data.tax || 0);

        if (Math.abs(expectedTotal - data.total) > 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El total es incorrecto",
                path: ["total"],
            });
        }

        // 📦 receivedAt solo si estado recibido
        if (data.status === "received" && !data.receivedAt) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Debe indicar fecha de recepción",
                path: ["receivedAt"],
            });
        }
    },
);
