// /lib/mappers/purchaseMapper.ts

import type { PurchaseDB } from "@/types/backend/purchase";
import type { PurchaseDTO } from "@/types/shared/purchase";

export function mapPurchaseToDTO(purchase: PurchaseDB): PurchaseDTO {
    return {
        id: purchase._id.toString(),

        supplierId: purchase.supplierId.toString(),
        supplierName: purchase.supplierName || undefined,

        status: purchase.status,

        items:
            purchase.items?.map((item) => ({
                productId: item.productId.toString(),
                quantity: item.quantity,
                cost: item.cost,
                total: item.quantity * item.cost,
            })) || [],

        document: purchase.document
            ? {
                  type: purchase.document.type || undefined,
                  number: purchase.document.number || undefined,
                  fileUrl: purchase.document.fileUrl || undefined,
              }
            : undefined,

        subtotal: purchase.subtotal,
        tax: purchase.tax || 0,
        total: purchase.total,

        notes: purchase.notes || undefined,

        receivedAt: purchase.receivedAt
            ? purchase.receivedAt.toISOString()
            : null,

        createdAt: purchase.createdAt.toISOString(),
    };
}
