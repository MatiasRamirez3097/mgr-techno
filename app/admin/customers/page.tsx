import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { getCustomersWithOrders } from "@/lib/customers/getCustomers";

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}

export default async function AdminCustomersPage({ searchParams }: Props) {
    const { page, per_page, search } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");

    const { customers, total, totalPages } = await getCustomersWithOrders({
        currentPage,
        page: page ? parseInt(page) : undefined,
        perPage,
        search,
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Clientes</h1>
                <AdminSearch placeholder="Buscar por nombre o email..." />
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-800">
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Cliente
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Ubicación
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Pedidos
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Total gastado
                            </th>
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                                Registrado
                            </th>
                            <th className="text-right text-xs text-gray-400 font-medium px-6 py-4">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-gray-400 text-sm"
                                >
                                    No se encontraron clientes
                                    {search ? ` para "${search}"` : ""}
                                </td>
                            </tr>
                        ) : (
                            customers.map((customer: any) => (
                                <tr
                                    key={customer.id}
                                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                {customer.first_name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ||
                                                    customer.email
                                                        ?.charAt(0)
                                                        ?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium">
                                                    {customer.first_name}{" "}
                                                    {customer.last_name}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {customer.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-300">
                                            {customer.billing?.city || "—"}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {customer.billing?.state || ""}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white">
                                        {customer.orders.length}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white">
                                        $
                                        {parseFloat(
                                            customer.total_spent || "0",
                                        ).toLocaleString("es-AR")}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {new Date(
                                            customer.createdAt,
                                        ).toLocaleDateString("es-AR", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Link
                                                href={`/admin/customers/${customer.id}`}
                                                title="Ver detalle de cliente"
                                                aria-label="Ver detalle de cliente"
                                                className="w-8 h-8 rounded-lg border bg-gray-800/80 border-gray-700/80 text-gray-300 hover:text-brand hover:bg-brand/10 hover:border-brand/40 flex items-center justify-center transition-all"
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
                                                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                </svg>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
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
