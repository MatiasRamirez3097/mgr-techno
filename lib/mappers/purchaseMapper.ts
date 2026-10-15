import type { PurchaseDTO } from "@/types/shared/purchase";
import { Types } from "mongoose";

type MapPurchaseOptions = {
    includeProducts?: boolean;
};

interface RawProductObject {
    _id?: Types.ObjectId | string;
    name?: string;
    hasSerialNumber?: boolean;
    isOutlet?: boolean;
}

interface RawPurchaseItem {
    productId?: Types.ObjectId | string | RawProductObject;
    name?: string;
    quantity?: number;
    receivedQuantity?: number;
    taxRate?: number;
    unitCost?: number;
}

interface RawPurchase {
    _id: Types.ObjectId | string;
    supplierId?: Types.ObjectId | string;
    supplierName?: string | null;
    status: "draft" | "confirmed" | "partially_received" | "received" | "cancelled";
    currency?: "ARS" | "USD";
    exchangeRate?: number;
    items?: RawPurchaseItem[];
    document?: {
        date?: Date | string | null;
        type?: string;
        number?: string;
        fileUrl?: string;
    };
    subtotal?: number;
    tax?: number;
    total?: number;
    notes?: string | null;
    receivedAt?: Date | string | null;
    createdAt?: Date | string;
}

export function mapPurchaseToDTO(
    purchase: RawPurchase,
    options?: MapPurchaseOptions,
): PurchaseDTO {
    const getProductId = (productId: unknown): string => {
        if (!productId) return "";
        if (typeof productId === "object" && productId !== null && "_id" in productId) {
            const rawId = (productId as { _id?: unknown })._id;
            return rawId ? String(rawId) : "";
        }
        return String(productId);
    };

    const items =
        purchase.items?.map((item: RawPurchaseItem) => ({
            productId: options?.includeProducts
                ? mapProduct(item.productId)
                : getProductId(item.productId),
            name: item.name || "Producto",
            quantity: item.quantity || 0,
            receivedQuantity: item.receivedQuantity || 0,
            taxRate: item.taxRate ?? 10.5,
            unitCost: item.unitCost || 0,
            total: (item.quantity || 0) * (item.unitCost || 0),
        })) || [];

    const itemsCount = items.reduce(
        (acc: number, item: { quantity: number }) => acc + (item.quantity || 0),
        0,
    );

    return {
        id: purchase._id.toString(),

        supplierId: purchase.supplierId ? purchase.supplierId.toString() : "",
        supplierName: purchase.supplierName || undefined,

        status: purchase.status,

        currency: purchase.currency || "ARS",
        exchangeRate: purchase.exchangeRate ?? 1,

        items,
        itemsCount,

        document: {
            date: purchase.document?.date
                ? new Date(purchase.document.date).toISOString()
                : "",
            type: purchase.document?.type || "generic",
            number: purchase.document?.number || "",
            fileUrl: purchase.document?.fileUrl || undefined,
        },
        subtotal: purchase.subtotal || 0,
        tax: purchase.tax || 0,
        total: purchase.total || 0,

        notes: purchase.notes || undefined,

        receivedAt: purchase.receivedAt
            ? new Date(purchase.receivedAt).toISOString()
            : null,

        createdAt: purchase.createdAt
            ? new Date(purchase.createdAt).toISOString()
            : new Date().toISOString(),
    };
}

function mapProduct(product: unknown) {
    if (typeof product === "object" && product !== null && "_id" in product) {
        const p = product as RawProductObject;
        return {
            id: p._id ? p._id.toString() : "",
            name: p.name || "",
            hasSerialNumber: Boolean(p.hasSerialNumber),
            isOutlet: Boolean(p.isOutlet),
        };
    }

    return {
        id: product ? String(product) : "",
    };
}
