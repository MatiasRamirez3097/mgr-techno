import { getProductsNew } from "@/lib/products/getProductsNew";
import { getProductsOnSale } from "@/lib/products/getProductsOnSale";
import { getCategoriesBase } from "@/lib/categories/getCategoriesBase";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRow } from "@/components/home/ProductRow";

export default async function HomePage() {
    const [onSale, categories, newProducts] = await Promise.all([
        getProductsOnSale(8),
        getCategoriesBase({}),
        getProductsNew(8),
    ]);
    return (
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-14">
            {/* Hero */}
            <HeroCarousel />

            {/* Categorías */}
            <CategoryGrid categories={categories} />

            {/* Productos en oferta */}
            <ProductRow
                title="🔥 Ofertas"
                products={onSale}
                href="/products?on_sale=true"
                linkLabel="Ver todas las ofertas"
            />

            {/* Productos nuevos */}
            <ProductRow
                title="✨ Novedades"
                products={newProducts}
                href="/products"
                linkLabel="Ver todos"
            />
        </div>
    );
}
