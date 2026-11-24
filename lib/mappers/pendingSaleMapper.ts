import type { PendingSaleDoc } from "@/types/backend/pendingSale";
import type { PendingSaleDTO } from "@/types/shared/pendingSale";

const toIso = (value: unknown): string | null =>
    value ? new Date(value as string | Date).toISOString() : null;

export function mapPendingSaleToDTO(doc: PendingSaleDoc): PendingSaleDTO {
    return {
        id: doc._id.toString(),
        productId: doc.productId?.toString() ?? "",
        productName: doc.productName ?? "",
        quantity: Number(doc.quantity) || 0,
        scannedCode: doc.scannedCode ?? "",
        status: doc.status ?? "pending",
        notes: doc.notes ?? "",
        createdBy: doc.createdBy ?? "",
        resolvedBy: doc.resolvedBy ?? "",
        resolvedAt: toIso(doc.resolvedAt),
        orderId: doc.orderId ? doc.orderId.toString() : null,
        createdAt: toIso(doc.createdAt) ?? new Date(0).toISOString(),
    };
}
