import Link from "next/link";

import { AdminPagination } from "@/components/admin/AdminPagination";

import { AdminSearch } from "@/components/admin/AdminSearch";

import { ProductsTable } from "@/components/admin/ProductsTable";

import { getCatalogProducts } from "@/services/products/getCatalogProducts";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { AdminProductFilters } from "@/components/admin/AdminProductFilters";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { buttonClass } from "@/components/admin/ui/styles";
import { FiltersDrawer } from "@/components/admin/ui/FiltersDrawer";

interface Props {
    searchParams: Promise<{
        category?: string;
        categoryId: string;
        page?: string;
        per_page?: string;
        search?: string;
        status?: "private" | "publish" | "draft" | "pending_review";
        stock?: string;
        quality?: string;
    }>;
}

export default async function AdminProductsPage({ searchParams }: Props) {
    // 1. Extraemos los parámetros de la URL
    const params = await searchParams;
    const page = Number(params.page) || 1;

    // 2. Traemos las categorías para el filtro y validación de atributos
    const categories = await getCategoriesBase({ limit: 0 });

    // 3. Armamos el objeto de filtros
    const filters = {
        search: params.search as string,
        category: params.category as string,
        categoryId: params.categoryId as string,
        status: params.status,
        stock: params.stock,
        quality: params.quality,
        // ¡CRUCIAL!: Le decimos al servicio que somos el admin
        // para que también nos traiga los productos en "draft" o "hidden"
        adminView: true,
        orderby: "date_desc", // Orden por defecto en el admin (los más nuevos primero)
    };
    // 4. LA MAGIA: Una sola llamada trae los productos y la paginación lista
    const { products, pagination } = await getCatalogProducts(
        filters,
        page,
        10,
    );

    return (
        <div>
            {/* ========================= */}
            {/* HEADER */}
            {/* ========================= */}

            <AdminPageHeader
                title="Productos"
                actions={
                    <>
                        <AdminSearch placeholder="Buscar por nombre, SKU o GTIN..." />
                        <Link href="/admin/products/new" className={buttonClass.primary}>
                            + Nuevo
                        </Link>
                    </>
                }
            />

            {/* ========================= */}
            {/* FILTERS */}
            {/* ========================= */}
            <FiltersDrawer
                className="mb-6"
                activeCount={[params.category, params.stock, params.quality, params.status].filter(Boolean).length}
            >
                <AdminProductFilters categories={categories} />
            </FiltersDrawer>

            <ProductsTable products={products} categories={categories} />

            <div className="mt-4">
                <AdminPagination {...pagination} />
            </div>
        </div>
    );
}
