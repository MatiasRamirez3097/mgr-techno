import { WOO_HEADERS } from "@/lib/woo";
import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";

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

async function getOrders(page: number, perPage: number, search?: string) {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        orderby: "date",
        order: "desc",
    });
    if (search) params.set("search", search);

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/orders?${params.toString()}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const total = parseInt(res.headers.get("X-WP-Total") || "0");
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1");
    const orders = await res.json();
    return { orders, total, totalPages };
}

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}

export default async function AdminOrdersPage({ searchParams }: Props) {
    const { page, per_page, search } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");

    const { orders, total, totalPages } = await getOrders(
        currentPage,
        perPage,
        search,
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Órdenes</h1>
                <AdminSearch placeholder="Buscar por nº de orden o cliente..." />
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
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-gray-400 text-sm"
                                >
                                    No se encontraron órdenes
                                    {search ? ` para "${search}"` : ""}
                                </td>
                            </tr>
                        ) : (
                            orders.map((order: any) => {
                                const status = STATUS_LABELS[order.status] || {
                                    label: order.status,
                                    color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                                };
                                return (
                                    <tr
                                        key={order.id}
                                        className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm text-white font-medium">
                                            #{order.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-white">
                                                {order.billing.first_name}{" "}
                                                {order.billing.last_name}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {order.billing.email}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}
                                            >
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white">
                                            $
                                            {parseFloat(
                                                order.total,
                                            ).toLocaleString("es-AR")}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(
                                                order.date_created,
                                            ).toLocaleDateString("es-AR", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/orders/${order.id}`}
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
                        total={total}
                        perPage={perPage}
                    />
                </div>
            </div>
        </div>
    );
}
