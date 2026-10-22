import { connectDB } from "@/lib/mongodb";
import { QuoteModel } from "@/models/Quote";
import { CustomerModel } from "@/models/Customer";
import { createAdminOrder } from "@/services/orders/createAdminOrder";

const NON_CONVERTIBLE_STATUSES = ["rejected", "expired"];

type QuoteItemDoc = {
    origin?: string;
    productId?: { toString(): string } | null;
    name: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    subtotal: number;
};

/**
 * Convierte un presupuesto en un pedido manual reutilizando createAdminOrder
 * (transacción, reserva de stock, totales e IVA). El pedido y la marca del
 * presupuesto como "converted" se guardan en la misma transacción.
 */
export async function convertQuoteToOrder(quoteId: string): Promise<{
    orderId: string;
    quoteNumber: string;
}> {
    await connectDB();

    const quote = await QuoteModel.findById(quoteId);
    if (!quote) {
        throw new Error("Presupuesto no encontrado");
    }

    if (quote.orderId) {
        return {
            orderId: quote.orderId.toString(),
            quoteNumber: quote.number,
        };
    }

    if (NON_CONVERTIBLE_STATUSES.includes(quote.status)) {
        throw new Error(
            "No se puede convertir un presupuesto rechazado o vencido",
        );
    }

    const items: QuoteItemDoc[] = quote.items || [];

    if (items.length === 0) {
        throw new Error("El presupuesto no tiene ítems");
    }

    // Un pedido necesita productos del catálogo para reservar stock y facturar
    const itemsWithoutProduct = items.filter((it) => !it.productId);
    if (itemsWithoutProduct.length > 0) {
        const names = itemsWithoutProduct.map((it) => `"${it.name}"`).join(", ");
        throw new Error(
            `Antes de convertir, dá de alta en el catálogo estos ítems (alta rápida) y reemplazalos en el presupuesto: ${names}`,
        );
    }

    // Cliente: el del presupuesto o, si no tiene, el registrado con su email
    let customer = quote.customerId
        ? await CustomerModel.findById(quote.customerId)
        : null;

    if (!customer && quote.customer?.email) {
        customer = await CustomerModel.findOne({
            email: quote.customer.email.toLowerCase(),
        });
    }

    if (!customer) {
        throw new Error(
            "El presupuesto no tiene un cliente registrado. Asigná un cliente existente antes de convertirlo.",
        );
    }

    // Los precios del presupuesto ya incluyen IVA; en USD se pasan a pesos
    const rate =
        quote.currency === "USD" ? Number(quote.exchangeRate) || 1 : 1;

    const orderItems = items.map((it) => {
        const quantity = Math.max(1, Number(it.quantity) || 1);
        // subtotal = total de la línea con IVA y descuento aplicado
        const lineTotal = (Number(it.subtotal) || 0) * rate;
        return {
            productId: it.productId!.toString(),
            name: it.name,
            quantity,
            unitPrice: Math.round((lineTotal / quantity) * 100) / 100,
            taxRate: it.taxRate ?? 10.5,
            isCustomPc: false,
            customComponents: [],
        };
    });

    const quoteAddress = quote.customer?.address;
    const billing = customer.billing || {};
    const documentNumber =
        customer.document?.number || quote.customer?.documentNumber || "";

    if (!documentNumber) {
        throw new Error(
            "El cliente no tiene número de documento cargado (requerido en el pedido).",
        );
    }

    const order = await createAdminOrder(
        {
            source: "admin",
            customerId: customer._id.toString(),
            customerEmail: customer.email || quote.customer?.email || "",
            status: "pending",
            items: orderItems,
            payments: [],
            shippingMethod: { method: "local_pickup", cost: 0 },
            billing: {
                firstName: billing.firstName || customer.firstName || "",
                lastName: billing.lastName || customer.lastName || "",
                address:
                    billing.address ||
                    [quoteAddress?.street, quoteAddress?.number]
                        .filter(Boolean)
                        .join(" "),
                city: billing.city || quoteAddress?.city || "",
                state: billing.state || quoteAddress?.state || "",
                postcode: billing.postcode || quoteAddress?.zip || "",
                phone: billing.phone || customer.phone || "",
                country: billing.country || "AR",
                document: {
                    documentType:
                        customer.document?.documentType ||
                        quote.customer?.documentType ||
                        "DNI",
                    number: documentNumber,
                },
            },
            notes: `Convertido desde Presupuesto Nº ${quote.number}. ${quote.notes || ""}`.trim(),
        },
        {
            afterCreate: async (createdOrder, session) => {
                quote.status = "converted";
                quote.orderId = createdOrder._id;
                await quote.save({ session });
            },
        },
    );

    return {
        orderId: order._id.toString(),
        quoteNumber: quote.number,
    };
}
