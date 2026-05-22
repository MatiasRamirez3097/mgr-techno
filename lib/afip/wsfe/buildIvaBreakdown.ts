export function buildIvaBreakdown(items: any[]) {
    const groups = new Map();

    for (const item of items) {
        const rate = item.taxRate;

        if (!groups.has(rate)) {
            groups.set(rate, {
                net: 0,
                iva: 0,
            });
        }

        const current = groups.get(rate);

        current.net += item.netSubtotal;

        current.iva += item.ivaAmount;
    }

    return Array.from(groups.entries()).map(([rate, values]) => ({
        rate,

        net: Number(values.net.toFixed(2)),

        iva: Number(values.iva.toFixed(2)),
    }));
}
