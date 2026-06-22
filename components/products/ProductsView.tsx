import { getCatalogProducts } from "@/services/products/getCatalogProducts";

import { ProductCard } from "@/components/productCard/ProductCard";
import { SortSelector } from "@/components/products/SortSelector";
import { AdminPagination } from "../admin/AdminPagination";
import type { ProductOrderBy } from "@/types/shared/product";
import { FilterButton } from "../layout/FilterButton";

interface Props {
    brand?: string;
    categoryId?: string;
    category?: string;
    search?: string;
    onSale?: boolean;
    page?: string;
    limit?: string; // NUEVO: Extraemos el limit de la URL
    orderby?: ProductOrderBy;
}

export async function ProductsView({
    brand,
    category,
    categoryId,
    onSale,
    search,
    page,
    limit, // NUEVO
    orderby,
}: Props) {
    const currentPage = Math.max(1, Number(page) || 1);

    // NUEVO: Leemos el limit de la URL (para que los botones 10, 15, 20 funcionen).
    // Usamos 10 por defecto para que coincida con el primer botón de tu AdminPagination.
    const currentLimit = Number(limit) || 12;

    // CORRECCIÓN VITAL: Separamos los argumentos en (1) filtros, (2) página, (3) límite
    const { availableBrands, products, pagination } = await getCatalogProducts(
        {
            onSale,
            category,
            categoryId,
            search,
            orderby,
            brand,
        },
        currentPage,
        currentLimit,
    );

    const title = search
        ? `Resultados para "${search}"`
        : category
          ? category.replace(/-/g, " ")
          : "Todos los productos";

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold capitalize">{title}</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {pagination.totalItems} producto
                        {pagination.totalItems !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <SortSelector />
                    <FilterButton brands={availableBrands} />
                </div>
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
                    <p className="text-lg">No se encontraron productos</p>
                    {search && (
                        <p className="text-sm">Intentá con otra búsqueda</p>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {products.map((product: any) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>

                    <AdminPagination {...pagination} />
                </>
            )}
        </main>
    );
}
