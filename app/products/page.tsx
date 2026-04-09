// app/products/page.tsx
import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/productCard/ProductCard";

export default async function ProductsPage() {
    const products = await getProducts();

    return (
        <main className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-bold mb-8">Productos</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </main>
    );
}
