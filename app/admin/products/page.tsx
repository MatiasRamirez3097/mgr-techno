import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { SyncButton } from "@/components/admin/SyncButton";
import { ProductModel } from "@/models/Product";
import { getProducts } from "@/lib/products/getProducts";

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

    const { products, total, totalPages } = await getProducts({
        search,
        page: currentPage,
        adminView: true,
    });

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
