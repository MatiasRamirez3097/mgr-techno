import type { Types } from "mongoose";
import { DEFAULT_STOCK_COUNT_SETTINGS } from "@/lib/inventory/stockCount";
import type {
    ExpectedStock,
    StockCountDTO,
    StockCountReason,
    StockCountSettingsDTO,
    StockCountStatus,
} from "@/types/shared/stockCount";

export type StockCountSettingsDoc = Partial<StockCountSettingsDTO>;

// Campos de StoreSettings que forman la configuración del conteo rotativo
export const STOCK_COUNT_SETTINGS_FIELDS = Object.keys(DEFAULT_STOCK_COUNT_SETTINGS) as (keyof StockCountSettingsDTO)[];

export const mapStockCountSettingsToDTO = (doc: StockCountSettingsDoc | null): StockCountSettingsDTO => ({
    stockCountDailyProducts: doc?.stockCountDailyProducts ?? DEFAULT_STOCK_COUNT_SETTINGS.stockCountDailyProducts,
    stockCountRepeatDays: doc?.stockCountRepeatDays ?? DEFAULT_STOCK_COUNT_SETTINGS.stockCountRepeatDays,
});

export interface StockCountDoc {
    _id: Types.ObjectId;
    productId: Types.ObjectId;
    productName: string;
    expected: ExpectedStock;
    counted: number;
    difference: number;
    status: StockCountStatus;
    reason?: StockCountReason | null;
    notes?: string;
    countedBy?: string;
    resolvedBy?: string;
    resolvedAt?: Date | null;
    writeOffCost?: number | null;
    pendingSaleId?: Types.ObjectId | null;
    createdAt: Date;
}

export function mapStockCountToDTO(
    doc: StockCountDoc,
    product?: { sku?: string; image?: string } | null,
): StockCountDTO {
    return {
        id: doc._id.toString(),
        productId: doc.productId.toString(),
        productName: doc.productName,
        sku: product?.sku || "",
        image: product?.image || null,
        expected: {
            totalStock: doc.expected.totalStock,
            pendingSalesUnits: doc.expected.pendingSalesUnits ?? 0,
            deliveredUnallocatedUnits: doc.expected.deliveredUnallocatedUnits ?? 0,
            allocatedUndeliveredUnits: doc.expected.allocatedUndeliveredUnits ?? 0,
            expected: doc.expected.expected,
        },
        counted: doc.counted,
        difference: doc.difference,
        status: doc.status,
        reason: doc.reason ?? null,
        notes: doc.notes || "",
        countedBy: doc.countedBy || "",
        countedAt: new Date(doc.createdAt).toISOString(),
        resolvedBy: doc.resolvedBy || "",
        resolvedAt: doc.resolvedAt ? new Date(doc.resolvedAt).toISOString() : null,
        writeOffCost: doc.writeOffCost ?? null,
        pendingSaleId: doc.pendingSaleId ? doc.pendingSaleId.toString() : null,
    };
}
