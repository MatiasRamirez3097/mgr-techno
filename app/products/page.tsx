// app/products/page.tsx
import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/productCard/ProductCard";

interface Props {
    searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function ProductosPage({ searchParams }: Props) {
    const { category, search } = await searchParams;

    const products = await getProducts({ category, search });

    const title = search
        ? `Resultados para "${search}"`
        : category
          ? category.replace(/-/g, " ")
          : "Todos los productos";

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold mb-2 capitalize">{title}</h1>
            <p className="text-sm text-gray-400 mb-8">
                {products.length} producto{products.length !== 1 ? "s" : ""}
            </p>

            {products.length === 0 ? (
                <p className="text-gray-500">No se encontraron productos.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </main>
    );
}
