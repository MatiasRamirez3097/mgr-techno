// Configuración de "Stock a rotar" (sólo admin)
export interface RotationSettingsDTO {
    // Ventana de ventas para calcular el ritmo (días hacia atrás)
    rotationSalesWindowDays: number;
    // Stock lento: más días de cobertura (stock ÷ ventas por día) que esto
    rotationSlowCoverageDays: number;
    // Stock viejo: unidades con más días desde que entraron que esto
    rotationOldStockDays: number;
    // Reposición más barata: el mejor costo del distribuidor está este % debajo de lo que pagamos
    rotationCheaperReplacementPercent: number;
    // Mostrar también lo que se vende rápido y se está por agotar
    rotationRestockEnabled: boolean;
    rotationRestockCoverageDays: number;
}

export type RotationReason = "slow" | "old" | "cheaper_replacement" | "restock";

export interface RotationRow {
    productId: string;
    name: string;
    sku: string;
    image: string | null;
    effectivePrice: number;
    availableStock: number;
    // Unidades vendidas en la ventana y ritmo diario
    unitsSold: number;
    dailySales: number;
    lastSaleAt: string | null;
    // Días que dura el stock al ritmo actual (null = sin ventas en la ventana)
    coverageDays: number | null;
    // Antigüedad de la unidad disponible más vieja (null = sin lotes cargados)
    oldestAgeDays: number | null;
    // Unidades con más días que el umbral de "viejo"
    oldUnits: number;
    // Costo con IVA de las unidades disponibles (según sus lotes) y su promedio
    stockCost: number;
    averageUnitCost: number | null;
    // Unidades disponibles sin lote de compra (sin costo ni antigüedad conocidos)
    unitsWithoutLots: number;
    // Unidades disponibles sin costo conocido (sin lote o con la compra sin costo)
    unitsWithoutCost: number;
    // Mejor costo con stock entre los distribuidores vinculados (ARS con IVA)
    replacementCost: number | null;
    replacementDistributor: string | null;
    // (reposición − costo promedio) ÷ costo promedio; negativo = reponer sale más barato
    replacementDiff: number | null;
    reasons: RotationReason[];
}

export interface RotationReport {
    settings: RotationSettingsDTO;
    rows: RotationRow[];
    summary: {
        // Productos con algún motivo para sacar (sin contar "reponer")
        toRotate: number;
        // Costo del stock de esos productos
        stockCost: number;
        byReason: Record<RotationReason, number>;
    };
}
