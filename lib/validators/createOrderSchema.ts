import { z } from "zod";

export const createOrderSchema = z.object({
    customerId: z.string(),

    customerEmail: z.email(),

    billing: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        address1: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        postcode: z.string().min(1),
        phone: z.string().min(1),
        country: z.string().default("AR"),
        documentType: z.string().optional(),
        documentNumber: z.string().optional(),
    }),

    shipping: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        address1: z.string().min(1),
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

    paymentMethod: z.enum(["mercadopago", "bacs", "cod"]),
    shippingMethod: z.enum(["local_pickup", "andreani"]),

    notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
