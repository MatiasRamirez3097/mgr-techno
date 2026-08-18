import { getCatalogProducts } from "@/services/products/getCatalogProducts";

import { ProductCard } from "@/components/productCard/ProductCard";
import { SortSelector } from "@/components/products/SortSelector";
import { AdminPagination } from "../admin/AdminPagination"; // Sugerencia: Quizás renombrar a CatalogPagination a futuro
import type { ProductOrderBy } from "@/types/shared/product";
import { FilterButton } from "../layout/FilterButton";
import { cookies } from "next/headers";

interface Props {
    brand?: string;
    categoryId?: string;
    category?: string;
    search?: string;
    onSale?: boolean;
    isOutlet?: string; // NUEVO: Capturamos el parámetro de outlet de la URL
    page?: string;
    limit?: string;
    orderby?: ProductOrderBy;
}

export async function ProductsView({
    brand,
    category,
    categoryId,
    onSale,
    isOutlet, // NUEVO
    search,
    page,
    limit,
    orderby,
}: Props) {
    const currentPage = Math.max(1, Number(page) || 1);
    const currentLimit = Number(limit) || 12;

    // Leemos la cookie para saber si el usuario quiere ocultar los productos sin stock
    const cookieStore = await cookies();
    // const hideOutOfStockCookie = cookieStore.get("hideOutOfStock");
    // const inStockOnly = hideOutOfStockCookie?.value === "true";
    const inStockOnly = true; // Forzado según tu código actual

    // Convertimos el string de la URL a booleano para el servicio
    const isOutletFilter = isOutlet === "true" ? true : undefined;

    const { availableBrands, products, pagination } = await getCatalogProducts(
        {
            onSale,
            isOutlet: isOutletFilter, // NUEVO: Pasamos el filtro al servicio
            category,
            categoryId,
            search,
            orderby,
            brand,
            inStockOnly,
        },
        currentPage,
        currentLimit,
    );

    // Mejoramos el título para que refleje si estamos viendo solo Outlet
    const title = search
        ? `Resultados para "${search}"`
        : isOutletFilter
          ? "Zona Outlet"
          : category
            ? category.replace(/-/g, " ")
            : "Todos los productos";

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold capitalize text-white flex items-center gap-3">
                        {title}
                        {isOutletFilter && (
                            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md">
                                OFERTAS ESPECIALES
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {pagination.totalItems} producto
                        {pagination.totalItems !== 1 ? "s" : ""}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <SortSelector />
                    <FilterButton
                        brands={availableBrands}
                        initialHideOutOfStock={inStockOnly}
                        initialIsOutlet={isOutletFilter} // NUEVO: Le pasamos el estado inicial al botón de filtros
                    />
                </div>
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-gray-900/50 rounded-2xl border border-gray-800">
                    <p className="text-lg font-medium text-gray-400">
                        No se encontraron productos
                    </p>
                    {search && (
                        <p className="text-sm">
                            Intentá con otra búsqueda o eliminá algunos filtros.
                        </p>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {products.map((product: any, index: number) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                priority={index < 4}
                            />
                        ))}
                    </div>

                    <div className="mt-12">
                        <AdminPagination {...pagination} />
                    </div>
                </>
            )}
        </main>
    );
}
