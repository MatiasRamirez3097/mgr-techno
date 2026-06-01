import Link from "next/link";

import { AdminPagination } from "@/components/admin/AdminPagination";

import { AdminSearch } from "@/components/admin/AdminSearch";

import { ProductsTable } from "@/components/admin/ProductsTable";

import { getProducts } from "@/services/products/getProducts";

interface Props {
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}

export default async function AdminProductsPage({ searchParams }: Props) {
    const { page, per_page, search } = await searchParams;

    const currentPage = Number(page) || 1;

    const perPage = Number(per_page) || 20;

    const { products, total, totalPages } = await getProducts({
        search,

        page: currentPage,

        perPage,

        adminView: true,
    });

    return (
        <div>
            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <div
                className="
                flex
                items-center
                justify-between
                mb-6
                gap-4
                flex-wrap
            "
            >
                <h1
                    className="
                    text-2xl
                    font-bold
                    text-white
                "
                >
                    Productos
                </h1>

                <div
                    className="
                    flex
                    items-center
                    gap-3
                    w-full
                    sm:w-auto
                "
                >
                    <AdminSearch
                        placeholder="
                            Buscar por nombre,
                            SKU o GTIN...
                        "
                    />

                    <Link
                        href="/admin/products/new"
                        className="
                            px-4
                            py-2
                            rounded-xl
                            bg-brand
                            text-white
                            text-sm
                            font-medium
                            hover:brightness-110
                            transition-all
                            shrink-0
                        "
                    >
                        + Nuevo
                    </Link>
                </div>
            </div>

            {/* ========================= */}
            {/* TABLE */}
            {/* ========================= */}

            <div
                className="
                bg-gray-900
                rounded-2xl
                border
                border-gray-800
                overflow-hidden
            "
            >
                <ProductsTable products={products} />

                {/* PAGINATION */}

                <div
                    className="
                    px-6
                    py-4
                    border-t
                    border-gray-800
                "
                >
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
