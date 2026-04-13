import { WOO_HEADERS } from "@/lib/woo";
import Link from "next/link";
import Image from "next/image";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { SyncButton } from "@/components/admin/SyncButton";

async function getAdminProducts(
    page: number,
    perPage: number,
    search?: string,
) {
    const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        orderby: "date",
        order: "desc",
    });
    if (search) params.set("search", search);

    const res = await fetch(
        `${process.env.WOO_URL}/wp-json/wc/v3/products?${params.toString()}`,
        { headers: WOO_HEADERS, cache: "no-store" },
    );
    const total = parseInt(res.headers.get("X-WP-Total") || "0");
    const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1");
    const products = await res.json();
    return { products, total, totalPages };
}

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}

export default async function AdminProductsPage({ searchParams }: Props) {
    const { page, per_page, search } = await searchParams;
    const currentPage = parseInt(page || "1");
    const perPage = parseInt(per_page || "20");

    const { products, total, totalPages } = await getAdminProducts(
        currentPage,
        perPage,
        search,
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Productos</h1>
                <div className="flex items-center gap-3">
                    <AdminSearch placeholder="Buscar por nombre, SKU o GTIN..." />
                    <Link
                        href="/admin/products/new"
                        className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:brightness-110 transition-all shrink-0"
                    >
                        + Nuevo
                    </Link>
                    <SyncButton />
                </div>
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                {/* Tabla como componente cliente para manejar el quick edit */}
                <ProductsTable products={products} />

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
