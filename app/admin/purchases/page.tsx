export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { getPurchases } from "@/lib/purchases/getPurchases";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    draft: {
        label: "Borrador",
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
    },
    confirmed: {
        label: "Confirmado",
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    partially_received: {
        label: "Parcialmente recibido",
        color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },
    received: {
        label: "Recibido",
        color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
    cancelled: {
        label: "Cancelado",
        color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
};

const STATUS_TABS = [
    { id: "all", label: "Todas" },
    { id: "draft", label: "Borradores" },
    { id: "confirmed", label: "Confirmadas" },
    { id: "partially_received", label: "Parciales" },
    { id: "received", label: "Recibidas" },
    { id: "cancelled", label: "Canceladas" },
];

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
        status?: string;
    }>;
}

export default async function AdminPurchasesPage({ searchParams }: Props) {
    const { page, per_page, search, status } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");
    const activeStatus = status || "all";

    const { purchases, total, totalPages } = await getPurchases({
        search,
        status: activeStatus,
        page: currentPage,
    });

    const formatMoney = (val: number, currency = "ARS") => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: currency === "USD" ? "USD" : "ARS",
        }).format(val || 0);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-white">Compras</h1>
                <div className="flex items-center gap-3">
                    <AdminSearch placeholder="Buscar compra..." />
                    <Link
                        href="/admin/purchases/new"
                        className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:brightness-110 transition-all shrink-0"
                    >
                        + Nueva compra
                    </Link>
                </div>
            </div>

            {/* Filtros por estado */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {STATUS_TABS.map((tab) => {
                    const isActive = activeStatus === tab.id;
                    const queryParams = new URLSearchParams();
                    if (search) queryParams.set("search", search);
                    if (tab.id !== "all") queryParams.set("status", tab.id);

                    const href = `/admin/purchases${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

                    return (
                        <Link
                            key={tab.id}
                            href={href}
                            className={`px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${
                                isActive
                                    ? "bg-brand/20 border-brand text-brand font-medium"
                                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-800 text-xs font-medium text-gray-400">
                            <th className="px-6 py-4">#</th>
                            <th className="px-6 py-4">Proveedor</th>
                            <th className="px-6 py-4">Comprobante</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-center">Items</th>
                            <th className="px-6 py-4 text-right">Total</th>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-800 text-sm">
                        {purchases.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-6 py-12 text-center text-gray-400"
                                >
                                    No se encontraron compras
                                </td>
                            </tr>
                        ) : (
                            purchases.map((purchase) => {
                                const statusConfig = STATUS_LABELS[
                                    purchase.status
                                ] || {
                                    label: purchase.status,
                                    color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                                };

                                const purchaseId = purchase.id
                                    .toString()
                                    .slice(-6)
                                    .toUpperCase();

                                const canReceive =
                                    purchase.status === "confirmed" ||
                                    purchase.status === "partially_received";

                                return (
                                    <tr
                                        key={purchase.id.toString()}
                                        className="hover:bg-gray-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 font-mono text-gray-300">
                                            #{purchaseId}
                                        </td>

                                        <td className="px-6 py-4 font-medium text-white">
                                            {purchase.supplierName ||
                                                "Sin proveedor"}
                                        </td>

                                        <td className="px-6 py-4 text-xs font-mono text-gray-300">
                                            {purchase.document?.number ? (
                                                <span>
                                                    {purchase.document.type === "invoice" ? "FAC " : ""}
                                                    {purchase.document.number}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500 italic">
                                                    Sin número
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            <span
                                                className={`text-xs px-2.5 py-1 rounded-full border inline-block ${statusConfig.color}`}
                                            >
                                                {statusConfig.label}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-center text-gray-300 font-mono">
                                            {purchase.itemsCount ??
                                                purchase.items?.reduce(
                                                    (acc, i) =>
                                                        acc + (i.quantity || 0),
                                                    0,
                                                ) ??
                                                "—"}
                                        </td>

                                        <td className="px-6 py-4 text-right font-mono font-medium text-white">
                                            {formatMoney(
                                                purchase.total,
                                                purchase.currency,
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(
                                                purchase.createdAt,
                                            ).toLocaleDateString("es-AR")}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {canReceive && (
                                                    <Link
                                                        href={`/admin/purchases/${purchase.id}/receive`}
                                                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 font-medium transition"
                                                    >
                                                        Recepcionar →
                                                    </Link>
                                                )}
                                                <Link
                                                    href={`/admin/purchases/${purchase.id}`}
                                                    className="text-xs text-brand hover:brightness-125 font-medium transition"
                                                >
                                                    {purchase.status === "received" ||
                                                    purchase.status === "cancelled"
                                                        ? "Ver detalle →"
                                                        : "Editar →"}
                                                </Link>
                                            </div>
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
