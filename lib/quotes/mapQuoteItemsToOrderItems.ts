// Forma mínima de un ítem del presupuesto (documento de Mongo o DTO) para convertirlo en pedido
type IdLike = { toString(): string } | string | null | undefined;

export interface QuoteItemForOrder {
    productId?: IdLike;
    name: string;
    quantity: number;
    taxRate?: number;
    subtotal: number;
    isCustomPc?: boolean;
    components?: { productId?: IdLike; name: string; quantity: number }[];
}

export interface OrderItemFromQuote {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    isCustomPc: boolean;
    customComponents: { productId: string; name: string; quantity: number }[];
}

const idOf = (id: IdLike) => (id ? id.toString() : "");

/**
 * Pasa los ítems de un presupuesto al formato de createAdminOrder. Un pedido necesita
 * productos del catálogo para reservar stock y facturar: si un ítem (o un componente de
 * una PC Armada) no tiene productId, lanza un error que los nombra.
 *
 * `rate` convierte a pesos los presupuestos en USD (1 si están en ARS).
 */
export function mapQuoteItemsToOrderItems(
    items: QuoteItemForOrder[],
    rate = 1,
): OrderItemFromQuote[] {
    const missing: string[] = [];
    for (const it of items) {
        if (it.isCustomPc) {
            for (const c of it.components || []) {
                if (!idOf(c.productId)) missing.push(`"${c.name}" (componente de "${it.name}")`);
            }
        } else if (!idOf(it.productId)) {
            missing.push(`"${it.name}"`);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Antes de convertir, dá de alta en el catálogo estos ítems (alta rápida) y reemplazalos en el presupuesto: ${missing.join(", ")}`,
        );
    }

    return items.map((it) => {
        const quantity = Math.max(1, Number(it.quantity) || 1);
        // subtotal = total de la línea con IVA y descuento aplicado
        const lineTotal = (Number(it.subtotal) || 0) * rate;
        const unitPrice = Math.round((lineTotal / quantity) * 100) / 100;
        const taxRate = it.taxRate ?? 10.5;

        if (it.isCustomPc) {
            return {
                productId: "",
                name: it.name,
                quantity,
                unitPrice,
                taxRate,
                isCustomPc: true,
                customComponents: (it.components || []).map((c) => ({
                    productId: idOf(c.productId),
                    name: c.name,
                    quantity: Math.max(1, Number(c.quantity) || 1),
                })),
            };
        }

        return {
            productId: idOf(it.productId),
            name: it.name,
            quantity,
            unitPrice,
            taxRate,
            isCustomPc: false,
            customComponents: [],
        };
    });
}
