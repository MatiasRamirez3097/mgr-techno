import { z } from "zod";

export const storeSettingsSchema = z.object({
    mercadoPagoSurchargePercent: z.number().min(0).max(100),
});

export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
