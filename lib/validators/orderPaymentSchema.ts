import { z } from "zod";

// Alineado con el enum de models/Payment.ts
export const orderPaymentSchema = z.object({
    method: z.enum([
        "cash",
        "bank_transfer",
        "debit_card",
        "credit_card",
        "mercadopago",
        "other",
    ]),
    status: z.enum(["pending", "paid", "failed", "refunded"]).default("paid"),
    amount: z.number().min(0),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

export type OrderPaymentInput = z.infer<typeof orderPaymentSchema>;
