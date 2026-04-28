import type { Metadata } from "next";
import { getProducts } from "@/lib/products/getProducts";
import { ProductCard } from "@/components/productCard/ProductCard";
import { Pagination } from "@/components/ui/Pagination";
import { SortSelector } from "@/components/products/SortSelector";

interface Props {
    searchParams: Promise<{
        category?: string;
        search?: string;
        page?: string;
        orderby?: "date" | "price" | "price-desc" | "name" | "popularity";
    }>;
}

export default async function ProductsPage({ searchParams }: Props) {
    const { category, search, page, orderby } = await searchParams;
    const currentPage = parseInt(page || "1");
    const { products, totalPages, total } = await getProducts({
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

    const basePath = new URLSearchParams();
    if (category) basePath.set("category", category);
    if (search) basePath.set("search", search);
    if (orderby) basePath.set("orderby", orderby);

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold capitalize">{title}</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {total} producto{total !== 1 ? "s" : ""}
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
                        basePath={`/products?${basePath.toString()}`}
                    />
                </>
            )}
        </main>
    );
}

export async function generateMetadata({
    searchParams,
}: Props): Promise<Metadata> {
    const { category, search } = await searchParams;

    const title = search
        ? `Resultados para "${search}"`
        : category
          ? category.replace(/-/g, " ")
          : "Todos los productos";

    return {
        title,
        description: search
            ? `Encontrá productos relacionados con ${search} en MGR Techno`
            : category
              ? `Comprá ${category.replace(/-/g, " ")} al mejor precio en MGR Techno`
              : "Explorá todo nuestro catálogo de tecnología",
    };
}
