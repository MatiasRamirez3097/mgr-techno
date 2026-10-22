import type { QuoteItemDTO } from "@/types/shared/quote";

/**
 * Calcula los totales y discrimina el IVA de un presupuesto.
 * REGLA DE NEGOCIO: El admin ingresa el precio unitario CON IVA INCLUIDO.
 * El cálculo discrimina el neto gravado y el importe de IVA según la alícuota especificada (ej. 21% o 10.5%).
 */
export function calculateQuoteTotals(items: Omit<QuoteItemDTO, "subtotal">[]): {
    itemsWithSubtotals: QuoteItemDTO[];
    subtotal: number;
    ivaTotal: number;
    discountTotal: number;
    total: number;
} {
    let subtotalNet = 0;
    let ivaTotal = 0;
    let discountTotal = 0;
    let totalGross = 0;

    const itemsWithSubtotals: QuoteItemDTO[] = items.map((item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unit = Math.max(0, Number(item.unitPrice) || 0); // Precio ingresado CON IVA
        const disc = Math.max(0, Number(item.discount) || 0);
        const taxRate = Number(item.taxRate) ?? 10.5;

        // Total de la línea con IVA incluido
        const lineGross = Math.max(0, unit * qty - disc);

        // Discriminación del IVA:
        // Neto = Bruto / (1 + alícuota / 100)
        // IVA = Bruto - Neto
        const lineNet = taxRate > 0 ? lineGross / (1 + taxRate / 100) : lineGross;
        const lineTax = lineGross - lineNet;

        subtotalNet += lineNet;
        ivaTotal += lineTax;
        discountTotal += disc;
        totalGross += lineGross;

        return {
            ...item,
            quantity: qty,
            unitPrice: unit,
            taxRate,
            discount: disc,
            subtotal: Math.round(lineGross * 100) / 100, // En la línea se muestra el total con IVA incluido
        };
    });

    return {
        itemsWithSubtotals,
        subtotal: Math.round(subtotalNet * 100) / 100, // Neto gravado (sin IVA)
        ivaTotal: Math.round(ivaTotal * 100) / 100,    // IVA discriminado
        discountTotal: Math.round(discountTotal * 100) / 100,
        total: Math.round(totalGross * 100) / 100,     // Total a abonar con IVA
    };
}
