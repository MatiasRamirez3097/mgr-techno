import { z } from "zod";

export const paymentSchema = z.object({
    method: z.enum([
        "mercadopago",
        "bank_transfer",
        "cod",
        "cash",
        "debit_card",
        "credit_card",
    ]),

    amount: z.number().positive(),

    status: z
        .enum(["pending", "paid", "failed", "refunded"])
        .default("pending"),

    reference: z.string().optional(),

    notes: z.string().optional(),
});

export const createOrderSchema = z.object({
    customerId: z.string(),

    customerEmail: z.email(),

    billing: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        postcode: z.string().min(1),
        phone: z.string().min(1),
        country: z.string().default("AR"),
        document: z.object({
            documentType: z.string(),
            number: z.string(),
        }),
    }),

    shipping: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        postcode: z.string().min(1),
        country: z.string().default("AR"),
    }),

    items: z
        .array(
            z.object({
                productId: z.string().min(1),
                quantity: z.number().int().min(1),
            }),
        )
        .min(1),
    source: z.enum(["ecommerce", "admin"]),
    payments: z.array(paymentSchema).min(1),
    shippingMethod: z.object({
        method: z.enum(["local_pickup", "andreani"]),
        title: z.string(),
        cost: z.number().min(0),
    }),

    notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
