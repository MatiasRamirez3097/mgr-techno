import { connectDB } from "@/lib/mongodb";
import { BusinessError } from "@/lib/errors/BusinessError";
import { buildOrderFromPendingSales } from "@/lib/pendingSales/buildOrderFromPendingSales";
import { convertPendingSalesSchema } from "@/lib/validators/pendingSaleSchema";
import { ProductModel } from "@/models";
import { PendingSaleModel } from "@/models/PendingSale";
import { createAdminOrder } from "@/services/orders/createAdminOrder";
import { getCustomersById } from "@/services/customers/getCustomersById";
import type { PendingSaleDoc } from "@/types/backend/pendingSale";

/**
 * Formaliza ventas escaneadas como un pedido de admin. El stock ya está reservado desde el
 * escaneo, así que el pedido no reserva de nuevo; las ventas se marcan como convertidas dentro
 * de la misma transacción (si otra persona ya las resolvió, se aborta todo).
 */
export async function convertPendingSales(data: unknown, resolvedBy: string) {
    const parsed = convertPendingSalesSchema.safeParse(data);
    if (!parsed.success) {
        throw new BusinessError(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
    }
    const { customerId, items, paymentMethod, paid, notes } = parsed.data;
    const ids = items.map((i) => i.pendingSaleId);

    await connectDB();

    const sales = await PendingSaleModel.find({ _id: { $in: ids }, status: "pending" }).lean<PendingSaleDoc[]>();
    if (sales.length !== ids.length) {
        throw new BusinessError("Alguna de las ventas ya fue formalizada o descartada", 409);
    }

    const products = await ProductModel.find({ _id: { $in: sales.map((s) => s.productId) } })
        .select("taxRate")
        .lean<{ _id: { toString(): string }; taxRate?: number }[]>();
    const taxRateById = new Map(products.map((p) => [p._id.toString(), p.taxRate]));

    const customer = await getCustomersById(customerId);
    if (!customer) throw new BusinessError("Cliente no encontrado", 404);

    const unitPrices = Object.fromEntries(items.map((i) => [i.pendingSaleId, i.unitPrice]));
    // Mismo orden en que se seleccionaron
    const orderedSales = ids.map((id) => sales.find((s) => s._id.toString() === id)!);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { total, ...orderBody } = buildOrderFromPendingSales(
        orderedSales.map((s) => ({
            id: s._id.toString(),
            productId: s.productId.toString(),
            productName: s.productName,
            quantity: s.quantity,
            createdAt: new Date(s.createdAt),
            notes: s.notes,
            taxRate: taxRateById.get(s.productId.toString()),
        })),
        { unitPrices, paymentMethod, paid, notes },
    );

    const order = await createAdminOrder(
        {
            ...orderBody,
            customerId,
            customerEmail: customer.email ?? "",
            billing: {
                ...customer.billing,
                document: {
                    documentType: customer.document?.documentType ?? "",
                    number: customer.document?.number ?? "",
                },
            },
        },
        {
            skipStockReservation: true,
            afterCreate: async (created, session) => {
                const result = await PendingSaleModel.updateMany(
                    { _id: { $in: ids }, status: "pending" },
                    {
                        $set: {
                            status: "converted",
                            orderId: created._id,
                            resolvedBy,
                            resolvedAt: new Date(),
                        },
                    },
                    { session },
                );
                if (result.modifiedCount !== ids.length) {
                    throw new BusinessError("Alguna de las ventas ya fue formalizada o descartada", 409);
                }
            },
        },
    );

    return { orderId: order._id.toString() };
}
