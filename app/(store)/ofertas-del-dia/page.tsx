import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/productCard/ProductCard";
import { DealCountdown } from "@/components/dailyDeals/DealCountdown";
import { getActiveDailyDeal } from "@/services/dailyDeals/getActiveDailyDeal";
import { getDailyDealProducts } from "@/services/dailyDeals/getDailyDealProducts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ofertas del día",
    description:
        "Descuentos que cambian todos los días en hardware, periféricos y componentes de PC. Sólo por hoy, hasta la medianoche.",
    alternates: { canonical: "/ofertas-del-dia" },
};

export default async function DailyDealsPage() {
    const deal = await getActiveDailyDeal();
    const products = deal ? await getDailyDealProducts(deal.productIds) : [];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <section className="relative overflow-hidden rounded-2xl border border-brand/40 bg-gray-900 p-6 sm:p-8 mb-8">
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-brand/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">⚡ Sólo por hoy</p>
                        <h1 className="mt-1 text-3xl sm:text-4xl font-black text-white">Ofertas del día</h1>
                        <p className="mt-2 text-sm text-gray-400 max-w-md">
                            Todos los días elegimos productos nuevos con descuento. Los precios valen hasta la
                            medianoche o hasta agotar stock.
                        </p>
                    </div>
                    {deal && products.length > 0 && (
                        <div>
                            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Terminan en</p>
                            <DealCountdown endsAt={deal.endsAt} variant="large" />
                        </div>
                    )}
                </div>
            </section>

            {products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product, i) => (
                        <ProductCard key={product.id} product={product} priority={i < 4} />
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-10 text-center">
                    <p className="text-white font-semibold">Hoy no hay ofertas del día.</p>
                    <p className="mt-1 text-sm text-gray-400">Volvé mañana, o mirá las demás ofertas de la tienda.</p>
                    <Link
                        href="/productos/ofertas"
                        className="inline-block mt-4 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:brightness-110"
                    >
                        Ver ofertas
                    </Link>
                </div>
            )}
        </div>
    );
}
