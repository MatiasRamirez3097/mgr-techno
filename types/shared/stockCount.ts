/**
 * Conteo rotativo de stock: cada día se cuentan unos pocos productos (sin número de serie) y se
 * compara con lo que debería haber en el local. Las diferencias se resuelven a mano.
 */

// matched: coincidió · difference: diferencia sin resolver · adjusted: se corrigió el stock ·
// pending_sale: el faltante quedó como venta escaneada pendiente · dismissed: se descartó (error
// al contar) · superseded: lo reemplazó un conteo posterior del mismo producto
export type StockCountStatus = "matched" | "difference" | "adjusted" | "pending_sale" | "dismissed" | "superseded";

// Motivo de un ajuste de stock
export type StockCountReason = "damaged" | "lost" | "data_error" | "found" | "other";

export type StockCountAction = "adjust" | "pending_sale" | "dismiss";

/** Lo que debería haber físicamente en el local, y de dónde sale */
export interface ExpectedStock {
    // Stock del sistema (incluye lo reservado para pedidos que todavía no se entregaron)
    totalStock: number;
    // Ventas escaneadas sin formalizar: ya no están en el local
    pendingSalesUnits: number;
    // Pedidos entregados (despachados o completados) a los que todavía no se les asignó lote
    deliveredUnallocatedUnits: number;
    // Pedidos con lote asignado que todavía no salieron del local
    allocatedUndeliveredUnits: number;
    expected: number;
}

export interface StockCountDTO {
    id: string;
    productId: string;
    productName: string;
    sku: string;
    image: string | null;
    expected: ExpectedStock;
    counted: number;
    // counted − expected: negativo = faltan, positivo = sobran
    difference: number;
    status: StockCountStatus;
    reason: StockCountReason | null;
    notes: string;
    countedBy: string;
    countedAt: string;
    resolvedBy: string;
    resolvedAt: string | null;
    // Costo (sin IVA) de las unidades dadas de baja
    writeOffCost: number | null;
    pendingSaleId: string | null;
}

/** Producto para contar hoy, con por qué se eligió. No incluye cuánto debería haber (conteo a ciegas). */
export interface StockCountQueueItem {
    productId: string;
    name: string;
    sku: string;
    image: string | null;
    lastCountedAt: string | null;
    unitsSold: number;
    why: string[];
}

export interface StockCountSettingsDTO {
    // Productos para contar por día
    stockCountDailyProducts: number;
    // Un producto contado no vuelve a la lista hasta pasados estos días
    stockCountRepeatDays: number;
    // Aviso a Discord a las 20:00 si faltó contar o quedaron diferencias sin resolver
    stockCountNotifyEnabled: boolean;
}

export interface StockCountOverview {
    settings: StockCountSettingsDTO;
    today: string;
    countedToday: number;
    queue: StockCountQueueItem[];
    differences: StockCountDTO[];
    history: StockCountDTO[];
}
