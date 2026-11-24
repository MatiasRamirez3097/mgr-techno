import { todayInStoreTimeZone } from "@/lib/utils/orderDate";

// IVA de ventas por defecto (mismo criterio que createAdminOrder)
const DEFAULT_TAX_RATE = 10.5;

export interface PendingSaleForOrder {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    createdAt: Date;
    notes?: string;
    taxRate?: number | null;
}

export interface BuildOrderOptions {
    unitPrices: Record<string, number>;
    paymentMethod: "cash" | "bank_transfer" | "mercadopago";
    paid: boolean;
    notes?: string;
}

/**
 * Arma el cuerpo de createAdminOrder a partir de ventas escaneadas. La cantidad sale de la
 * venta pendiente (es lo que quedó reservado); el precio lo define quien formaliza. El pedido
 * queda con la fecha del primer escaneo, para que la venta cuente el día en que ocurrió.
 */
export function buildOrderFromPendingSales(sales: PendingSaleForOrder[], options: BuildOrderOptions) {
    if (sales.length === 0) throw new Error("No hay ventas para formalizar");

    const items = sales.map((sale) => {
        const unitPrice = options.unitPrices[sale.id];
        if (unitPrice == null || !Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`Falta el precio de ${sale.productName}`);
        }
        return {
            productId: sale.productId,
            name: sale.productName,
            quantity: sale.quantity,
            unitPrice,
            taxRate: sale.taxRate ?? DEFAULT_TAX_RATE,
            isCustomPc: false,
            customComponents: [],
        };
    });

    const total = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const firstScan = sales.reduce(
        (min, sale) => (sale.createdAt < min ? sale.createdAt : min),
        sales[0].createdAt,
    );

    const scanNotes = sales
        .filter((s) => s.notes)
        .map((s) => `${s.productName}: ${s.notes}`);
    const notes = [options.notes?.trim(), ...scanNotes].filter(Boolean).join("\n");

    return {
        source: "admin" as const,
        status: "completed" as const,
        items,
        payments: options.paid
            ? [{ method: options.paymentMethod, amount: total, status: "paid" as const }]
            : [],
        shippingMethod: { method: "local_pickup" as const, cost: 0 },
        orderDate: todayInStoreTimeZone(firstScan),
        notes: notes || undefined,
        total,
    };
}
