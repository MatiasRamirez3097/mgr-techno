// /lib/mappers/purchaseMapper.ts

import type { PurchaseDB } from "@/types/backend/purchase";
import type { PurchaseDTO } from "@/types/shared/purchase";

export function mapPurchaseToDTO(purchase: PurchaseDB): PurchaseDTO {
    const getProductId = (productId: any) =>
        typeof productId === "object" ? productId : productId.toString();

    const getProductName = (item: any) =>
        typeof item.productId === "object" ? item.productId.name : item.name;
    return {
        id: purchase._id.toString(),

        supplierId: purchase.supplierId.toString(),
        supplierName: purchase.supplierName || undefined,

        status: purchase.status,

        items:
            purchase.items?.map((item) => ({
                productId: getProductId(item.productId),
                name: item.name,
                quantity: item.quantity,
                taxRate: item.taxRate,
                unitCost: item.unitCost,
                total: item.quantity * item.unitCost,
            })) || [],

        document: {
            date: purchase.document.date
                ? purchase.document.date.toISOString()
                : "",
            type: purchase.document.type || "generic",
            number: purchase.document.number || "",
            fileUrl: purchase.document.fileUrl || undefined,
        },
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
