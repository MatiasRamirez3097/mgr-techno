export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { QuotesTable } from "@/components/admin/quotes/QuotesTable";
import { getQuotes } from "@/services/quotes/getQuotes";
import type { QuoteStatus } from "@/types/shared/quote";

const STATUS_TABS: { id: QuoteStatus | "all"; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "draft", label: "Borradores" },
    { id: "sent", label: "Enviados" },
    { id: "accepted", label: "Aceptados" },
    { id: "expired", label: "Vencidos" },
    { id: "rejected", label: "Rechazados" },
    { id: "converted", label: "Convertidos" },
];

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
        status?: string;
    }>;
}

export default async function AdminQuotesPage({ searchParams }: Props) {
    const { page, per_page, search, status } = await searchParams;
    const currentPage = parseInt(page || "1", 10);
    const perPage = parseInt(per_page || "15", 10);
    const activeStatus = (status as QuoteStatus | "all") || "all";

    const { quotes, pagination } = await getQuotes({
        search,
        status: activeStatus,
        page: currentPage,
        limit: perPage,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Presupuestos</h1>
                    <p className="text-xs text-gray-400 mt-1">
                        Cotizaciones a clientes con productos de tienda, distribuidores o manuales (Comprobante X).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <AdminSearch placeholder="Buscar presupuesto..." />
                    <Link
                        href="/admin/quotes/new"
                        className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:brightness-110 transition-all shrink-0"
                    >
                        + Nuevo presupuesto
                    </Link>
                </div>
            </div>

            {/* Filtros por estado */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-thin scrollbar-thumb-gray-800">
                {STATUS_TABS.map((tab) => {
                    const isActive = activeStatus === tab.id;
                    const queryParams = new URLSearchParams();
                    if (search) queryParams.set("search", search);
                    if (tab.id !== "all") queryParams.set("status", tab.id);

                    const href = `/admin/quotes${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

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

            <QuotesTable quotes={quotes} search={search} status={activeStatus} />

            <AdminPagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                limit={pagination.limit}
            />
        </div>
    );
}
