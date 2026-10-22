import { connectDB } from "@/lib/mongodb";
import { QuoteModel } from "@/models/Quote";
import { OrderModel } from "@/models/Order";
import { CustomerModel } from "@/models/Customer";

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

    // Asegurar o buscar cliente
    let customerId = quote.customerId;
    if (!customerId && quote.customer?.email) {
        const existingCust = await CustomerModel.findOne({
            email: quote.customer.email.toLowerCase(),
        }).select("_id");
        if (existingCust) {
            customerId = existingCust._id;
        }
    }

    // Mapear items a formato OrderItem
    const orderItems = quote.items.map((it: any) => ({
        productId: it.productId || null,
        name: it.name,
        price: it.unitPrice,
        regularPrice: it.unitPrice,
        quantity: it.quantity,
        sku: it.sku || "",
        taxRate: it.taxRate ?? 10.5,
        discount: it.discount || 0,
        subtotal: it.subtotal,
    }));

    const newOrder = new OrderModel({
        customerId: customerId || undefined,
        billing: {
            firstName: quote.customer?.name || "Cliente",
            lastName: "",
            email: quote.customer?.email || "",
            phone: quote.customer?.phone || "",
            document: {
                documentType: quote.customer?.documentType || "DNI",
                number: quote.customer?.documentNumber || "",
            },
            ivaCondition: quote.customer?.ivaCondition || "Consumidor Final",
            address_1: quote.customer?.address?.street
                ? `${quote.customer.address.street} ${quote.customer.address.number || ""}`.trim()
                : "",
            city: quote.customer?.address?.city || "",
            state: quote.customer?.address?.state || "",
            postcode: quote.customer?.address?.zip || "",
        },
        items: orderItems,
        status: "pending",
        currency: quote.currency || "ARS",
        exchangeRate: quote.exchangeRate || 1,
        total: quote.total,
        notes: `Convertido desde Presupuesto Nº ${quote.number}. ${quote.notes || ""}`.trim(),
    });

    const savedOrder = await newOrder.save();

    // Actualizar presupuesto
    quote.status = "converted";
    quote.orderId = savedOrder._id;
    await quote.save();

    return {
        orderId: savedOrder._id.toString(),
        quoteNumber: quote.number,
    };
}
