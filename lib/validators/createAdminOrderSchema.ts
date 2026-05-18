import { z } from "zod";

export const createAdminOrderSchema = z.object({
    customerId: z.string().min(1),
    customerEmail: z.string(),
    status: z.enum([
        "pending",
        "processing",
        "on_hold",
        "completed",
        "cancelled",
        "refunded",
        "failed",
    ]),

    source: z.literal("admin"),

    items: z
        .array(
            z.object({
                productId: z.string().min(1),

                name: z.string().optional(),

                quantity: z.number().int().min(1),

                unitPrice: z.number().min(0),

                taxRate: z.number().min(0).max(100),
            }),
        )
        .min(1),

    payments: z.array(
        z.object({
            method: z.enum(["cash", "bank_transfer", "mercadopago"]),

            amount: z.number().min(0),

            status: z.enum(["pending", "paid", "failed", "refunded"]),

            reference: z.string().optional(),
        }),
    ),

    shippingMethod: z.object({
        method: z.enum(["local_pickup", "delivery", "andreani", "other"]),

        cost: z.number().min(0),
    }),

    document: z.object({
        date: z.string(),

        type: z.enum(["generic", "invoice"]),

        number: z.string().optional(),

        fileUrl: z.string().optional(),
    }),

    notes: z.string().optional(),
});

export type CreateAdminOrderInput = z.infer<typeof createAdminOrderSchema>;
