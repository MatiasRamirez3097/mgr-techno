import { WOO_HEADERS } from "@/lib/woo";
import { OrderStatusSelector } from "@/components/admin/OrderStatusSelector";
import Link from "next/link";

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

async function getOrder(id: string) {
    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/orders/${id}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    return res.json();
}

export default async function AdminOrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const order = await getOrder(id);
    const status = STATUS_LABELS[order.status] || {
        label: order.status,
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
    };

    return (
        <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/orders"
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">
                    Orden #{order.id}
                </h1>
                <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}
                >
                    {status.label}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Productos */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Productos
                        </h2>
                        <div className="flex flex-col gap-3">
                            {order.line_items.map((item: any) => (
                                <div
                                    key={item.id}
                                    className="flex justify-between text-sm"
                                >
                                    <span className="text-gray-300">
                                        {item.name} x{item.quantity}
                                    </span>
                                    <span className="text-white">
                                        $
                                        {parseFloat(item.total).toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-700 mt-4 pt-4 flex flex-col gap-2">
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Subtotal</span>
                                <span>
                                    $
                                    {parseFloat(
                                        order.subtotal || order.total,
                                    ).toLocaleString("es-AR")}
                                </span>
                            </div>
                            {order.shipping_lines?.[0] && (
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span>
                                        Envío (
                                        {order.shipping_lines[0].method_title})
                                    </span>
                                    <span>
                                        $
                                        {parseFloat(
                                            order.shipping_lines[0].total,
                                        ).toLocaleString("es-AR")}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-bold text-white mt-1">
                                <span>Total</span>
                                <span>
                                    $
                                    {parseFloat(order.total).toLocaleString(
                                        "es-AR",
                                    )}
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
                                    {order.billing.first_name}{" "}
                                    {order.billing.last_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Email</p>
                                <p className="text-white">
                                    {order.billing.email}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Teléfono</p>
                                <p className="text-white">
                                    {order.billing.phone || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-400 mb-1">Dirección</p>
                                <p className="text-white">
                                    {order.billing.address_1},{" "}
                                    {order.billing.city}, {order.billing.state}{" "}
                                    ({order.billing.postcode})
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Panel derecho */}
                <div className="flex flex-col gap-4">
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Cambiar estado
                        </h2>
                        <OrderStatusSelector
                            orderId={order.id}
                            currentStatus={order.status}
                        />
                    </section>

                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Pago
                        </h2>
                        <p className="text-sm text-gray-400">Método</p>
                        <p className="text-sm text-white mb-3">
                            {order.payment_method_title}
                        </p>
                        <p className="text-sm text-gray-400">Estado</p>
                        <p className="text-sm text-white">
                            {order.date_paid ? "Pagado" : "Pendiente de pago"}
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
