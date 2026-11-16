import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { getCustomersWithOrders } from "@/services/customers/getCustomers";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { ResponsiveTable } from "@/components/admin/ui/ResponsiveTable";
import { ViewDetailLink } from "@/components/admin/ui/ViewDetailLink";

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
            <AdminPageHeader title="Clientes" actions={<AdminSearch placeholder="Buscar por nombre o email..." />} />

            <ResponsiveTable
                rows={customers as any[]}
                getRowKey={(customer) => String(customer.id)}
                rowHref={(customer) => `/admin/customers/${customer.id}`}
                empty={`No se encontraron clientes${search ? ` para "${search}"` : ""}`}
                columns={[
                    {
                        key: "avatar",
                        header: "",
                        mobile: "media",
                        desktop: false,
                        cell: (customer) => <Avatar customer={customer} />,
                    },
                    {
                        key: "customer",
                        header: "Cliente",
                        mobile: "title",
                        cell: (customer) => (
                            <div className="flex items-center gap-3">
                                <span className="hidden md:block">
                                    <Avatar customer={customer} />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm text-white font-medium">
                                        {customer.first_name} {customer.last_name}
                                    </p>
                                    <p className="hidden md:block text-xs text-gray-400">{customer.email}</p>
                                </div>
                            </div>
                        ),
                    },
                    { key: "email", header: "Email", mobile: "subtitle", desktop: false, cell: (customer) => customer.email },
                    {
                        key: "location",
                        header: "Ubicación",
                        cell: (customer) => (
                            <>
                                <span className="text-gray-300">{customer.billing?.city || "—"}</span>
                                {customer.billing?.state && (
                                    <span className="block text-xs text-gray-500">{customer.billing.state}</span>
                                )}
                            </>
                        ),
                    },
                    { key: "orders", header: "Pedidos", className: "text-white", cell: (customer) => customer.orders.length },
                    {
                        key: "spent",
                        header: "Total gastado",
                        className: "text-white whitespace-nowrap",
                        cell: (customer) => `$${parseFloat(customer.total_spent || "0").toLocaleString("es-AR")}`,
                    },
                    {
                        key: "createdAt",
                        header: "Registrado",
                        className: "text-gray-400 whitespace-nowrap",
                        cell: (customer) => new Date(customer.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }),
                    },
                    {
                        key: "actions",
                        header: "Acciones",
                        align: "right",
                        mobile: "hidden",
                        cell: (customer) => (
                            <ViewDetailLink href={`/admin/customers/${customer.id}`} label="Ver detalle de cliente" />
                        ),
                    },
                ]}
            />

            <div className="mt-4">
                <AdminPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={total}
                    limit={perPage}
                />
            </div>
        </div>
    );
}

function Avatar({ customer }: { customer: { first_name?: string; email?: string } }) {
    return (
        <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
            {customer.first_name?.charAt(0)?.toUpperCase() || customer.email?.charAt(0)?.toUpperCase()}
        </div>
    );
}
