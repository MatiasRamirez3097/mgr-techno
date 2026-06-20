import Link from "next/link";

import { AdminPagination } from "@/components/admin/AdminPagination";

import { AdminSearch } from "@/components/admin/AdminSearch";

import { ProductsTable } from "@/components/admin/ProductsTable";

import { getCatalogProducts } from "@/services/products/getCatalogProducts";

interface Props {
    searchParams: Promise<{
        category?: string;
        categoryId: string;
        page?: string;
        per_page?: string;
        search?: string;
        status?: "private" | "publish" | "draft" | "pending_review";
    }>;
}

export default async function AdminProductsPage({ searchParams }: Props) {
    // 1. Extraemos los parámetros de la URL
    const params = await searchParams;
    const page = Number(params.page) || 1;

    // 2. Armamos el objeto de filtros
    const filters = {
        search: params.search as string,
        category: params.category as string,
        categoryId: params.categoryId as string,
        status: params.status,
        // ¡CRUCIAL!: Le decimos al servicio que somos el admin
        // para que también nos traiga los productos en "draft" o "hidden"
        adminView: true,
        orderby: "date_desc", // Orden por defecto en el admin (los más nuevos primero)
    };
    // 3. LA MAGIA: Una sola llamada trae los productos y la paginación lista
    const { products, pagination } = await getCatalogProducts(
        filters,
        page,
        10,
    ); //

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
                    <AdminPagination {...pagination} />
                </div>
            </div>
        </div>
    );
}
