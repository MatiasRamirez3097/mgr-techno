export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { OrderStatusFilter } from "@/components/admin/OrderStatusFilter";
import { getOrders } from "@/lib/orders/getOrders";
import type { OrderDTO } from "@/types/shared/order";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: {
        label: "Pendiente",
        color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },
    processing: {
        label: "En proceso",
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    ready_for_pickup: {
        label: "Listo para retiro",
        color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    },
    shipped: {
        label: "Enviado",
        color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
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

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
        status?: string;
    }>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
    const { page, per_page, search, status } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");

    const { orders, total, totalPages } = await getOrders({
        search,
        status,
        page: currentPage,
        adminView: true,
    });

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white">Órdenes</h1>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <AdminSearch placeholder="Buscar por email o cliente..." />
                    <Link
                        href="/admin/orders/new"
                        className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:brightness-110 transition-all shrink-0"
                    >
                        + Nueva orden
                    </Link>
                </div>
            </div>

            <div className="mb-6">
                <OrderStatusFilter />
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                #
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Cliente
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Estado
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Facturación
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Total
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Fecha
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-6 py-12 text-center text-gray-400 text-sm"
                                >
                                    No se encontraron órdenes
                                    {search ? ` para "${search}"` : ""}
                                    {status && status !== "all"
                                        ? ` con estado "${STATUS_LABELS[status]?.label || status}"`
                                        : ""}
                                </td>
                            </tr>
                        ) : (
                            orders.map((order: OrderDTO) => {
                                const orderStatus = STATUS_LABELS[
                                    order.status
                                ] || {
                                    label: order.status,
                                    color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                                };
                                const orderId = order.id
                                    .toString()
                                    .slice(-6)
                                    .toUpperCase();

                                const fiscalInvoice = order.vouchers?.find(
                                    (v) => v.type === "fiscal_invoice",
                                );
                                const receipt = order.vouchers?.find(
                                    (v) => v.type === "non_fiscal_receipt",
                                );

                                return (
                                    <tr
                                        key={order.id.toString()}
                                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm text-white font-medium">
                                             #{orderId}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-white">
                                                {order.billing?.firstName}{" "}
                                                {order.billing?.lastName}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {order.customerEmail}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${orderStatus.color}`}
                                            >
                                                {orderStatus.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {fiscalInvoice ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    Factura AFIP
                                                    {fiscalInvoice.number
                                                        ? ` #${fiscalInvoice.number}`
                                                        : ""}
                                                </span>
                                            ) : receipt ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border text-sky-400 bg-sky-400/10 border-sky-400/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                                    Comprobante
                                                    {receipt.number
                                                        ? ` #${receipt.number}`
                                                        : ""}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border text-gray-400 bg-gray-400/10 border-gray-400/20">
                                                    Sin facturar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white">
                                            $
                                            {order.total.toLocaleString(
                                                "es-AR",
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(
                                                order.createdAt,
                                            ).toLocaleDateString("es-AR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/orders/${order.id.toString()}`}
                                                className="text-xs text-brand hover:brightness-125 transition-all"
                                            >
                                                Ver detalle →
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                <div className="px-6 py-4 border-t border-gray-800">
                    <AdminPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={total}
                        limit={perPage}
                    />
                </div>
            </div>
        </div>
    );
}
