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
    received: {
        label: "Recibido",
        color: "text-green-400 bg-green-400/10 border-green-400/20",
    },
    cancelled: {
        label: "Cancelado",
        color: "text-red-400 bg-red-400/10 border-red-400/20",
    },
};

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}

export default async function AdminPurchasesPage({ searchParams }: Props) {
    const { page, per_page, search } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");

    const { purchases, total, totalPages } = await getPurchases({
        search,
        page: currentPage,
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Compras</h1>
                <AdminSearch placeholder="Buscar compra..." />
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="px-6 py-4 text-xs text-gray-400">
                                #
                            </th>
                            <th className="px-6 py-4 text-xs text-gray-400">
                                Proveedor
                            </th>
                            <th className="px-6 py-4 text-xs text-gray-400">
                                Estado
                            </th>
                            <th className="px-6 py-4 text-xs text-gray-400">
                                Items
                            </th>
                            <th className="px-6 py-4 text-xs text-gray-400">
                                Fecha
                            </th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>

                    <tbody>
                        {purchases.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-gray-400"
                                >
                                    No se encontraron compras
                                </td>
                            </tr>
                        ) : (
                            purchases.map((purchase: any) => {
                                const status = STATUS_LABELS[
                                    purchase.status
                                ] || {
                                    label: purchase.status,
                                    color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                                };

                                const purchaseId = purchase._id
                                    .toString()
                                    .slice(-6)
                                    .toUpperCase();

                                return (
                                    <tr
                                        key={purchase._id.toString()}
                                        className="border-b border-gray-800 hover:bg-gray-800/50"
                                    >
                                        <td className="px-6 py-4 text-white">
                                            #{purchaseId}
                                        </td>

                                        <td className="px-6 py-4">
                                            <p className="text-white">
                                                {purchase.supplierId?.name ||
                                                    "Sin proveedor"}
                                            </p>
                                        </td>

                                        <td className="px-6 py-4">
                                            <span
                                                className={`text-xs px-2 py-1 rounded border ${status.color}`}
                                            >
                                                {status.label}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-gray-300">
                                            {purchase.itemsCount || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-gray-400">
                                            {new Date(
                                                purchase.createdAt,
                                            ).toLocaleDateString("es-AR")}
                                        </td>

                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/admin/purchases/${purchase._id}`}
                                                className="text-xs text-brand hover:brightness-125"
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
