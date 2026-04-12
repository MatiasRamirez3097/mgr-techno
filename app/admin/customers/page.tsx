import { WOO_HEADERS } from "@/lib/woo";
import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";

async function getCustomers(page: number, perPage: number, search?: string) {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        orderby: "registered_date",
        order: "desc",
    });
    if (search) params.set("search", search);

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/customers?${params.toString()}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const total = parseInt(res.headers.get("X-WP-Total") || "0");
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1");
    const customers = await res.json();
    return { customers, total, totalPages };
}

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

    const { customers, total, totalPages } = await getCustomers(
        currentPage,
        perPage,
        search,
    );

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
                            <th className="text-left text-xs text-gray-400 font-medium px-6 py-4"></th>
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
                                        {customer.orders_count}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-white">
                                        $
                                        {parseFloat(
                                            customer.total_spent || "0",
                                        ).toLocaleString("es-AR")}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {new Date(
                                            customer.date_created,
                                        ).toLocaleDateString("es-AR", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/admin/customers/${customer.id}`}
                                            className="text-xs text-brand hover:brightness-125 transition-all"
                                        >
                                            Ver detalle →
                                        </Link>
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
                        total={total}
                        perPage={perPage}
                    />
                </div>
            </div>
        </div>
    );
}
