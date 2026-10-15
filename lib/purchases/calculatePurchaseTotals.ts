export interface PurchasableItemForTotals {
    quantity: number;
    unitCost: number;
    taxRate?: number;
}

export function calculatePurchaseTotals(items: PurchasableItemForTotals[]) {
    let subtotal = 0;
    let tax = 0;

    for (const item of items) {
        const itemSubtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
        const rate = item.taxRate !== undefined && item.taxRate !== null ? Number(item.taxRate) : 10.5;
        const itemTax = itemSubtotal * (rate / 100);

        subtotal += itemSubtotal;
        tax += itemTax;
    }

    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedTax = Math.round(tax * 100) / 100;
    const roundedTotal = Math.round((roundedSubtotal + roundedTax) * 100) / 100;

    return {
        subtotal: roundedSubtotal,
        tax: roundedTax,
        total: roundedTotal,
    };
}
