import { z } from "zod";

const customPcComponentSchema = z.object({
    productId: z.string().min(1),
    name: z.string().optional(),
    quantity: z.number().int().min(1),
});

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
            z
                .object({
                    productId: z.string().optional().default(""),
                    name: z.string().optional(),
                    quantity: z.number().int().min(1),
                    unitPrice: z.number().min(0),
                    taxRate: z.number().min(0).max(100),
                    isCustomPc: z.boolean().optional().default(false),
                    customComponents: z
                        .array(customPcComponentSchema)
                        .optional()
                        .default([]),
                })
                .superRefine((item, ctx) => {
                    if (item.isCustomPc) {
                        if (
                            !item.customComponents ||
                            item.customComponents.length === 0
                        ) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message:
                                    "La PC Armada debe tener al menos un componente asignado",
                                path: ["customComponents"],
                            });
                        }
                    } else if (!item.productId || !item.productId.trim()) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: "Debe seleccionar un producto",
                            path: ["productId"],
                        });
                    }
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
        // Alineado con Order.shippingMethod.method
        method: z.enum([
            "local_pickup",
            "local_shipping",
            "andreani",
            "viacargo",
        ]),
        cost: z.number().min(0),
    }),

    // Fecha del pedido (YYYY-MM-DD) para cargar ventas pasadas; ver parseOrderDate
    orderDate: z.string().optional(),
    billing: z.object({
        firstName: z.string(),
        lastName: z.string(),
        address: z.string(),
        city: z.string(),
        state: z.string(),
        postcode: z.string(),
        phone: z.string(),
        country: z.string(),
        document: z.object({
            documentType: z.string(),
            number: z.string(),
        }),
    }),
    notes: z.string().optional(),
});

export type CreateAdminOrderInput = z.infer<typeof createAdminOrderSchema>;
