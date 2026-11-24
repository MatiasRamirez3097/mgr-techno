import type { Types } from "mongoose";

/** Forma en DB de una venta escaneada (ver models/PendingSale.ts). */
export interface PendingSaleDoc {
    _id: Types.ObjectId;
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    scannedCode?: string;
    status: "pending" | "converted" | "discarded";
    notes?: string;
    createdBy?: string;
    resolvedBy?: string;
    resolvedAt?: Date | null;
    orderId?: Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

/** Campos del producto que se leen al buscar por código. */
export interface ProductCodeLookupDoc {
    _id: Types.ObjectId;
    name: string;
    image?: string;
    images?: string[];
    sku?: string;
    mpn?: string;
    gtin?: string;
    availableStock?: number;
    effectivePrice?: number;
    type?: string;
}
