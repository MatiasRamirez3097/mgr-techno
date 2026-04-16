import {} from //getOnSaleProducts,
//getNewProducts,
//getCategoriesWithImages,
"@/lib/products";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRow } from "@/components/home/ProductRow";

export default async function HomePage() {
    const [onSale, newProducts, categories] = await Promise.all([
        //getOnSaleProducts(8),
        //getNewProducts(8),
        //getCategoriesWithImages(),
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
