import { getProducts } from "@/services/products/getProducts";

import { ProductCard } from "@/components/productCard/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import { SortSelector } from "@/components/products/SortSelector";

import type { ProductOrderBy } from "@/types/shared/product";

interface Props {
    category?: string;
    search?: string;
    onSale?: boolean;
    page?: string;
    orderby?: ProductOrderBy;
}

export async function ProductsView({
    category,
    onSale,
    search,
    page,
    orderby,
}: Props) {
    const currentPage = Math.max(1, Number(page) || 1);

    const { products, totalPages, total } = await getProducts({
        onSale,
        category,
        search,
        page: currentPage,
        orderby,
    });

    const title = search
        ? `Resultados para "${search}"`
        : category
          ? category.replace(/-/g, " ")
          : "Todos los productos";

    const query = new URLSearchParams();

    if (search) {
        query.set("search", search);
    }

    if (orderby) {
        query.set("orderby", orderby);
    }

    const basePath = category
        ? `/productos/categoria/${category}`
        : "/productos";

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold capitalize">{title}</h1>

                    <p className="text-sm text-gray-400 mt-1">
                        {total} producto
                        {total !== 1 ? "s" : ""}
                    </p>
                </div>

                <SortSelector />
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
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        basePath={`${basePath}${query.toString() ? `?${query.toString()}` : ""}`}
                    />
                </>
            )}
        </main>
    );
}
