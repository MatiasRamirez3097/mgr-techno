import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/productCard/ProductCard";
import { Pagination } from "@/components/ui/Pagination";

interface Props {
    searchParams: Promise<{
        category?: string;
        search?: string;
        page?: string;
    }>;
}

export default async function ProductosPage({ searchParams }: Props) {
    const { category, search, page } = await searchParams;
    const currentPage = parseInt(page || "1");

    const { products, totalPages, total } = await getProducts({
        category,
        search,
        page: currentPage,
    });

    const title = search
        ? `Resultados para "${search}"`
        : category
          ? category.replace(/-/g, " ")
          : "Todos los productos";

    // Construir base path manteniendo los filtros activos
    const basePath = new URLSearchParams();
    if (category) basePath.set("category", category);
    if (search) basePath.set("search", search);
    const baseUrl = `/products?${basePath.toString()}`;

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex items-baseline justify-between mb-8">
                <h1 className="text-2xl font-bold capitalize">{title}</h1>
                <p className="text-sm text-gray-400">
                    {total} producto{total !== 1 ? "s" : ""}
                </p>
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
                        basePath={baseUrl}
                    />
                </>
            )}
        </main>
    );
}
