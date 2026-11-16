import Link from "next/link";
import { notFound } from "next/navigation";
import {
    getCustomersById,
    getCustomersByIdWIthOrders,
} from "@/services/customers/getCustomersById";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";

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

type CustomerOrder = { id: string; status: string; total: string | number; createdAt: string | Date };

export default async function AdminCustomerDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const customer = await getCustomersByIdWIthOrders(id);

    if (!customer) notFound();

    const orders = customer.orders as CustomerOrder[];
    // Sin contar canceladas, fallidas ni devueltas
    const totalSpent = orders
        .filter((o) => !["cancelled", "failed", "refunded"].includes(o.status))
        .reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const formatDate = (d: string | Date) =>
        new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

    return (
        <div className="max-w-5xl">
            <AdminPageHeader
                back={{ href: "/admin/customers", label: "Clientes" }}
                title={`${customer.firstName} ${customer.lastName}`}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-6">
                    {/* Info personal */}
                    <section className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-brand flex items-center justify-center text-white text-xl font-bold shrink-0">
                                {customer.firstName?.charAt(0)?.toUpperCase() ||
                                    customer.email?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-medium">
                                    {customer.firstName} {customer.lastName}
                                </p>
                                <p className="text-sm text-gray-400 break-all">
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
                                <span className="text-white">{customer.orders.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">
                                    Total gastado
                                </span>
                                <span className="text-white font-medium">
                                    ${totalSpent.toLocaleString("es-AR")}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Dirección */}
                    <section className="bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800">
                        <h2 className="text-base font-bold text-white mb-4">
                            Dirección de envío
                        </h2>
                        <div className="flex flex-col gap-2 text-sm">
                            <p className="text-white">
                                {customer.billing?.address || "—"}
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
                        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-800">
                            <h2 className="text-base font-bold text-white">
                                Pedidos
                            </h2>
                        </div>

                        {customer.orders.length === 0 ? (
                            <div className="px-6 py-12 text-center text-gray-400 text-sm">
                                Este cliente no tiene pedidos aún
                            </div>
                        ) : (
                            <ResponsiveTable
                                variant="bare"
                                minWidth="560px"
                                rows={orders}
                                getRowKey={(order) => String(order.id)}
                                rowHref={(order) => `/admin/orders/${order.id}`}
                                columns={[
                                    {
                                        key: "id",
                                        header: "#",
                                        mobile: "title",
                                        className: "text-sm text-white font-medium",
                                        cell: (order) => `#${String(order.id).slice(-6).toUpperCase()}`,
                                    },
                                    {
                                        key: "status",
                                        header: "Estado",
                                        mobile: "badge",
                                        cell: (order) => {
                                            const status = STATUS_LABELS[order.status] || {
                                                label: order.status,
                                                color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                                            };
                                            return (
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            );
                                        },
                                    },
                                    {
                                        key: "total",
                                        header: "Total",
                                        className: "text-sm text-white",
                                        cell: (order) => `$${Number(order.total).toLocaleString("es-AR")}`,
                                    },
                                    {
                                        key: "date",
                                        header: "Fecha",
                                        className: "text-sm text-gray-400",
                                        cell: (order) => formatDate(order.createdAt),
                                    },
                                    {
                                        key: "view",
                                        header: "",
                                        mobile: "hidden",
                                        align: "right",
                                        cell: (order) => (
                                            <Link
                                                href={`/admin/orders/${order.id}`}
                                                className="text-xs text-brand hover:brightness-125 transition-all"
                                            >
                                                Ver →
                                            </Link>
                                        ),
                                    },
                                ]}
                            />
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
