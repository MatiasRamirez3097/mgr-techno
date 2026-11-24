import type { ProductCodeField } from "@/lib/scan/productCode";

export type PendingSaleStatus = "pending" | "converted" | "discarded";

export interface PendingSaleDTO {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    scannedCode: string;
    status: PendingSaleStatus;
    notes: string;
    createdBy: string;
    resolvedBy: string;
    resolvedAt: string | null;
    orderId: string | null;
    createdAt: string;
}

/** Producto encontrado al escanear un código. */
export interface ScannedProductDTO {
    id: string;
    name: string;
    image: string | null;
    sku: string;
    mpn: string;
    gtin: string;
    availableStock: number;
    effectivePrice: number;
    type: "simple" | "bundle";
    // Campos en los que coincidió el código
    matchedFields: ProductCodeField[];
}
