import Link from "next/link";
import { notFound } from "next/navigation";
import {
    getCustomersById,
    getCustomersByIdWIthOrders,
} from "@/lib/customers/getCustomersById";

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

export default async function AdminCustomerDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const customer = await getCustomersByIdWIthOrders(id);

    if (!customer) notFound();

    return (
        <div className="max-w-5xl">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/customers"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">
                    {customer.firstName} {customer.lastName}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-6">
                    {/* Info personal */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold shrink-0">
                                {customer.firstName?.charAt(0)?.toUpperCase() ||
                                    customer.email?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                                <p className="text-white font-medium">
                                    {customer.firstName} {customer.lastName}
                                </p>
                                <p className="text-sm text-gray-400">
                                    {customer.email}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Teléfono</span>
                                <span className="text-white">
                                    {customer.billing?.phone || "—"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">
                                    Registrado
                                </span>
                                <span className="text-white">
                                    {new Date(
                                        customer.createdAt,
                                    ).toLocaleDateString("es-AR", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">
                                    Total pedidos
                                </span>
                                <span className="text-white">
                                    {customer.orders_count}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">
                                    Total gastado
                                </span>
                                <span className="text-white font-medium">
                                    $
                                    {parseFloat(
                                        customer.total_spent || "0",
                                    ).toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Dirección */}
                    <section className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Dirección de envío
                        </h2>
                        <div className="flex flex-col gap-2 text-sm">
                            <p className="text-white">
                                {customer.billing?.address_1 || "—"}
                            </p>
                            <p className="text-gray-400">
                                {[
                                    customer.billing?.city,
                                    customer.billing?.state,
                                    customer.billing?.postcode,
                                ]
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        </div>
                    </section>
                </div>

                {/* Pedidos del cliente */}
                <div className="lg:col-span-2">
                    <section className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-800">
                            <h2 className="text-base font-bold text-white">
                                Pedidos
                            </h2>
                        </div>

                        {customer.orders.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-400 text-sm">
                                Este cliente no tiene pedidos aún
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-800">
                                        <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">
                                            #
                                        </th>
                                        <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">
                                            Estado
                                        </th>
                                        <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">
                                            Total
                                        </th>
                                        <th className="text-left text-xs text-gray-400 font-medium px-6 py-3">
                                            Fecha
                                        </th>
                                        <th className="text-left text-xs text-gray-400 font-medium px-6 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customer.orders.map((order: any) => {
                                        const status = STATUS_LABELS[
                                            order.status
                                        ] || {
                                            label: order.status,
                                            color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                                        };
                                        return (
                                            <tr
                                                key={order.id}
                                                className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                                            >
                                                <td className="px-6 py-3 text-sm text-white font-medium">
                                                    #{order.id}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span
                                                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}
                                                    >
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-white">
                                                    $
                                                    {parseFloat(
                                                        order.total,
                                                    ).toLocaleString("es-AR")}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-400">
                                                    {new Date(
                                                        order.date_created,
                                                    ).toLocaleDateString(
                                                        "es-AR",
                                                        {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                        },
                                                    )}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="text-xs text-brand hover:brightness-125 transition-all"
                                                    >
                                                        Ver →
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
