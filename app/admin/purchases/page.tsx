export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { getPurchases } from "@/services/purchases/getPurchases";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { buttonClass } from "@/components/admin/ui/styles";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";
import { ViewDetailLink } from "@/components/admin/ui/ViewDetailLink";

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
            <AdminPageHeader
                title="Compras"
                className="!mb-0"
                actions={
                    <>
                        <AdminSearch placeholder="Buscar compra..." />
                        <Link href="/admin/purchases/new" className={buttonClass.primary}>
                            + Nueva compra
                        </Link>
                    </>
                }
            />

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

            <ResponsiveTable
                rows={purchases}
                getRowKey={(purchase) => purchase.id.toString()}
                rowHref={(purchase) => `/admin/purchases/${purchase.id}`}
                minWidth="860px"
                empty="No se encontraron compras"
                columns={[
                    {
                        key: "number",
                        header: "#",
                        mobile: "hidden",
                        className: "font-mono text-gray-300",
                        cell: (purchase) => `#${purchase.id.toString().slice(-6).toUpperCase()}`,
                    },
                    {
                        key: "supplier",
                        header: "Proveedor",
                        mobile: "title",
                        className: "font-medium text-white",
                        cell: (purchase) => (
                            <>
                                <span className="md:hidden font-mono font-normal text-gray-400">
                                    #{purchase.id.toString().slice(-6).toUpperCase()} ·{" "}
                                </span>
                                {purchase.supplierName || "Sin proveedor"}
                            </>
                        ),
                    },
                    {
                        key: "document",
                        header: "Comprobante",
                        mobile: "subtitle",
                        className: "text-xs font-mono text-gray-300",
                        cell: (purchase) =>
                            purchase.document?.number ? (
                                <span className="font-mono">
                                    {purchase.document.type === "invoice" ? "FAC " : ""}
                                    {purchase.document.number}
                                </span>
                            ) : (
                                <span className="text-gray-500 italic">Sin número</span>
                            ),
                    },
                    {
                        key: "status",
                        header: "Estado",
                        mobile: "badge",
                        cell: (purchase) => {
                            const s = STATUS_LABELS[purchase.status] || {
                                label: purchase.status,
                                color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                            };
                            return (
                                <span className={`text-xs px-2.5 py-1 rounded-full border inline-block whitespace-nowrap ${s.color}`}>
                                    {s.label}
                                </span>
                            );
                        },
                    },
                    {
                        key: "items",
                        header: "Items",
                        align: "center",
                        className: "text-gray-300 font-mono",
                        cell: (purchase) =>
                            purchase.itemsCount ??
                            purchase.items?.reduce((acc, i) => acc + (i.quantity || 0), 0) ??
                            "—",
                    },
                    {
                        key: "total",
                        header: "Total",
                        align: "right",
                        className: "font-mono font-medium text-white whitespace-nowrap",
                        cell: (purchase) => formatMoney(purchase.total, purchase.currency),
                    },
                    {
                        key: "date",
                        header: "Fecha",
                        className: "text-xs text-gray-400 whitespace-nowrap",
                        cell: (purchase) => new Date(purchase.createdAt).toLocaleDateString("es-AR"),
                    },
                    {
                        key: "actions",
                        header: "Acciones",
                        align: "right",
                        mobile: "actions",
                        cell: (purchase) => {
                            const canReceive = purchase.status === "confirmed" || purchase.status === "partially_received";
                            const isReadOnly = purchase.status === "received" || purchase.status === "cancelled";
                            return (
                                <div className="flex items-center justify-end gap-1.5">
                                    {canReceive && (
                                        <Link
                                            href={`/admin/purchases/${purchase.id}/receive`}
                                            title="Recepcionar mercadería"
                                            aria-label="Recepcionar mercadería"
                                            className="h-9 rounded-lg border bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-center gap-1.5 px-2 md:w-9 md:px-0 transition-all"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={1.8}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                                                />
                                            </svg>
                                            <span className="text-xs md:hidden">Recepcionar</span>
                                        </Link>
                                    )}
                                    <span className="hidden md:block">
                                        <ViewDetailLink
                                            href={`/admin/purchases/${purchase.id}`}
                                            label={isReadOnly ? "Ver detalle de compra" : "Editar compra"}
                                            icon={isReadOnly ? "view" : "edit"}
                                        />
                                    </span>
                                </div>
                            );
                        },
                    },
                ]}
            />

            <AdminPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={total}
                limit={perPage}
            />
        </div>
    );
}
