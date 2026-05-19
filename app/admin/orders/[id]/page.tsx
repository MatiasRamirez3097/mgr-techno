export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/mongodb";
import { StatusSelector } from "@/components/admin/StatusSelector";
import { ORDER_STATUSES, ORDER_PAYMENT_STATUSES } from "@/lib/constants/status";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrdersById } from "@/lib/orders/getOrdersById";
import { getAllocationSuggestions } from "@/lib/inventory/getAllocationSuggestions";
import { InventoryAllocationSection } from "@/components/admin/InventoryAllocationSection";
import { PaymentStatusSelector } from "@/components/admin/PaymentStatusSelector";
import { getOrderPaymentStatus } from "@/lib/orders/getOrderPaymentStatus";
import { OrderPaymentsSection } from "@/components/admin/OrderPaymentsSection";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    mercadopago: "MercadoPago",
    bank_transfer: "Transferencia bancaria",
    cash: "Efectivo",
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> =
    {
        pending: {
            label: "Pendiente",
            color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
        },

        paid: {
            label: "Pagado",
            color: "text-green-400 bg-green-400/10 border-green-400/20",
        },

        failed: {
            label: "Fallido",
            color: "text-red-400 bg-red-400/10 border-red-400/20",
        },

        refunded: {
            label: "Reembolsado",
            color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
        },

        partial: {
            label: "Pago parcial",
            color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
        },
    };

const SHIPPING_METHOD_LABELS: Record<string, string> = {
    local_pickup: "Retiro en local",
    andreani: "Andreani",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: {
        label: "Pendiente",
        color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },
    processing: {
        label: "En proceso",
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    on_hold: {
        label: "En espera",
        color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    },
    completed: {
        label: "Completado",
        color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
    cancelled: {
        label: "Cancelado",
        color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
    refunded: {
        label: "Reembolsado",
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
    },
    failed: {
        label: "Fallido",
        color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
};

export default async function AdminOrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    await connectDB();

    const order = await getOrdersById(id);
    if (!order) notFound();

    const status = STATUS_LABELS[order.status] || {
        label: order.status,
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
    };
    const orderId = order.id.toString().slice(-6).toUpperCase();

    const payments = order.payments || [];
    const paymentStatus = getOrderPaymentStatus(order.payments || []);

    const paymentStatusMeta = PAYMENT_STATUS_LABELS[paymentStatus];
    const paidAmount = payments
        .filter((p) => p.status === "paid")
        .reduce((acc, p) => acc + p.amount, 0);

    const remaining = order.total - paidAmount;
    const allocationSuggestions =
        paymentStatus === "paid"
            ? await getAllocationSuggestions(order.id)
            : [];
    return (
        <div className="max-w-7xl w-full">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/orders"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">
                    Orden #{orderId}
                </h1>
                <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}
                >
                    {status.label}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col gap-6">
                    {/* Productos */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Productos
                        </h2>
                        <div className="flex flex-col gap-3">
                            {order.items.map((item: any, i: number) => (
                                <div
                                    key={i}
                                    className="flex justify-between text-sm"
                                >
                                    <span className="text-gray-300">
                                        {item.name} x{item.quantity}
                                    </span>
                                    <span className="text-white">
                                        ${item.total.toLocaleString("es-AR")}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-700 mt-4 pt-4 flex flex-col gap-2">
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Subtotal</span>
                                <span>
                                    ${order.subtotal.toLocaleString("es-AR")}
                                </span>
                            </div>
                            {order.shippingMethod.cost > 0 && (
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>
                                        Envío (
                                        {order.shippingMethod?.method ===
                                        "andreani"
                                            ? "Andreani"
                                            : "Retiro en local"}
                                        )
                                    </span>
                                    <span>
                                        $
                                        {order.shippingMethod?.cost.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-bold text-white mt-1">
                                <span>Total</span>
                                <span>
                                    ${order.total.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Datos del cliente */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Cliente
                        </h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-400 mb-1">Nombre</p>
                                <p className="text-white">
                                    {order.billing?.firstName}{" "}
                                    {order.billing?.lastName}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Email</p>
                                <p className="text-white">
                                    {order.customerEmail}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Teléfono</p>
                                <p className="text-white">
                                    {order.billing?.phone || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Documento</p>
                                <p className="text-white">
                                    {order.billing?.document?.documentType}{" "}
                                    {order.billing?.document?.number || "—"}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-gray-400 mb-1">Dirección</p>
                                <p className="text-white">
                                    {order.billing?.address1},{" "}
                                    {order.billing?.city},{" "}
                                    {order.billing?.state} (
                                    {order.billing?.postcode})
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Panel derecho */}
                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                            <h2 className="text-base font-bold text-white mb-4">
                                Cambiar estado de la orden
                            </h2>
                            <StatusSelector
                                name="status"
                                keyToChange="status"
                                apiUrl="/api/admin/orders/"
                                statusOptions={ORDER_STATUSES}
                                orderId={order.id.toString()}
                                currentStatus={order.status}
                            />
                        </section>
                    </div>
                    {paymentStatus === "paid" &&
                        order.status !== "cancelled" && (
                            <InventoryAllocationSection
                                inventoryAllocatedAt={
                                    order.inventoryAllocatedAt
                                }
                                orderId={order.id}
                                items={order.items}
                                allocationSuggestions={allocationSuggestions}
                            />
                        )}
                    <OrderPaymentsSection
                        mode="persisted"
                        orderId={order.id}
                        total={order.total}
                        payments={order.payments || []}
                    />
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="border-t border-gray-700 mt-4 pt-4">
                            <p className="text-sm text-gray-400">
                                Método de envío
                            </p>

                            <p className="text-sm text-white">
                                {
                                    SHIPPING_METHOD_LABELS[
                                        order.shippingMethod?.method
                                    ]
                                }
                            </p>

                            {order.shippingMethod?.cost > 0 && (
                                <p className="text-sm text-gray-400 mt-1">
                                    $
                                    {order.shippingMethod.cost.toLocaleString(
                                        "es-AR",
                                    )}
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
