import type { QuoteItemDTO } from "@/types/shared/quote";

export function calculateQuoteTotals(items: Omit<QuoteItemDTO, "subtotal">[]): {
    itemsWithSubtotals: QuoteItemDTO[];
    subtotal: number;
    ivaTotal: number;
    discountTotal: number;
    total: number;
} {
    let subtotal = 0;
    let ivaTotal = 0;
    let discountTotal = 0;

    const itemsWithSubtotals: QuoteItemDTO[] = items.map((item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unit = Math.max(0, Number(item.unitPrice) || 0);
        const disc = Math.max(0, Number(item.discount) || 0);
        const taxRate = Number(item.taxRate) ?? 10.5;

        const lineNet = unit * qty - disc;
        const lineTax = lineNet * (taxRate / 100);

        subtotal += lineNet;
        ivaTotal += lineTax;
        discountTotal += disc;

        return {
            ...item,
            quantity: qty,
            unitPrice: unit,
            taxRate,
            discount: disc,
            subtotal: lineNet,
        };
    });

    const total = subtotal + ivaTotal;

    return {
        itemsWithSubtotals,
        subtotal: Math.round(subtotal * 100) / 100,
        ivaTotal: Math.round(ivaTotal * 100) / 100,
        discountTotal: Math.round(discountTotal * 100) / 100,
        total: Math.round(total * 100) / 100,
    };
}
