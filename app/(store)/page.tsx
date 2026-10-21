export const revalidate = 43200;

import type { Metadata } from "next";
import { getProductsNew } from "@/services/products/getProductsNew";
import { getProductsOnSale } from "@/services/products/getProductsOnSale";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductRow } from "@/components/home/ProductRow";

export const metadata: Metadata = {
    title: "MGR Techno | Tienda de Computación, PC Gamer y Hardware en Argentina",
    description:
        "Encontrá las mejores ofertas en placas de video, procesadores, memorias RAM, monitores y armados de PC en MGR Techno. Envíos a todo el país con garantía oficial.",
    alternates: {
        canonical: "/",
    },
};

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
                href="/productos/ofertas"
                linkLabel="Ver todas las ofertas"
            />

            {/* Productos nuevos */}
            <ProductRow
                title="✨ Novedades"
                products={newProducts}
                href="/productos"
                linkLabel="Ver todos"
            />
        </div>
    );
}
