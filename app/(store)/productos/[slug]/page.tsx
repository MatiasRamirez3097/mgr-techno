export const revalidate = 3600;

import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";

import { ProductSchema } from "@/components/products/ProductSchema";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { ProductGallery } from "@/components/products/ProductGallery";
import MetaProductView from "@/components/MetaProductView";
import { OutletSelector } from "@/components/products/OutletSelector";

import { getPricing } from "@/lib/pricing";
import { getProductBySlug as getProductBySlugService } from "@/services/products/getProductBySlug";

import { connectDB } from "@/lib/mongodb";
import { InventoryItemModel } from "@/models/InventoryItem";
import { getOptimizedImageUrl } from "@/lib/utils/imageUtils";

interface Props {
    params: Promise<{
        slug: string;
    }>;
}

const getProductBySlug = cache(async (slug: string) => {
    return getProductBySlugService(slug);
});

export default async function ProductPage({ params }: Props) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
        notFound();
    }

    const pricing = getPricing({
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
    });

    // 🔥 NUEVO: Calculamos el % de descuento que representa el precio especial
    const discountPercentage = Math.round(
        ((pricing.listPriceFinal - pricing.finalPrice) /
            pricing.listPriceFinal) *
            100,
    );

    let outletUnits: any[] = [];
    if (product.isOutlet) {
        await connectDB();
        const items = await InventoryItemModel.find({
            productId: product.id,
            status: "available",
            remainingQuantity: { $gt: 0 },
        }).lean();

        outletUnits = items.map((item: any) => ({
            id: item._id.toString(),
            defectDescription:
                item.defectDescription || "Sin detalle especificado",
        }));
    }

    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <MetaProductView
                productId={product.id}
                price={product.effectivePrice}
            />

            {product.isOutlet && (
                <div className="mb-6 inline-flex items-center gap-2 bg-purple-900/30 border border-purple-500/50 text-purple-300 px-4 py-2 rounded-lg text-sm">
                    <span className="font-bold uppercase tracking-wider">
                        Zona Outlet
                    </span>
                    <span>•</span>
                    <span>
                        Estos productos presentan detalles estéticos o de
                        embalaje.
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <ProductGallery
                    images={[product.image, ...(product.images || [])].filter(
                        Boolean,
                    )}
                    name={product.name}
                />

                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold title-color">
                        {product.name}
                    </h1>

                    {/* ================= SECCIÓN DE PRECIOS RENOVADA ================= */}
                    <div className="flex flex-col gap-3 mt-2">
                        {/* CAJA PRECIO ESPECIAL (Destacada estilo "Mejor Precio") */}
                        <div className="bg-gray-900 border border-green-500/40 rounded-xl p-5 relative overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.03)]">
                            {/* Resplandor sutil de fondo */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl rounded-full pointer-events-none"></div>

                            {/* Fila Superior: Métodos y Etiqueta */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-2 text-green-400">
                                    <div className="bg-green-500/20 p-1 rounded-md">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                            className="w-4 h-4"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-medium">
                                        Efectivo / Transferencia
                                    </span>
                                </div>

                                <span className="bg-green-500 text-gray-900 text-[11px] font-black px-2.5 py-1.5 rounded uppercase tracking-wide">
                                    Mejor Precio
                                </span>
                            </div>

                            {/* Fila Inferior: Descuento y Precios */}
                            <div className="flex items-end justify-between mt-2">
                                {/* Badge de descuento abajo a la izquierda */}
                                <div className="hidden sm:block">
                                    {discountPercentage > 0 && (
                                        <span className="border border-green-500/40 text-green-400 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-green-500/5">
                                            {discountPercentage}% OFF por medio
                                            de pago
                                        </span>
                                    )}
                                </div>

                                {/* Bloque de precios a la derecha */}
                                <div className="flex flex-col items-end">
                                    {product.salePrice && (
                                        <span className="text-sm text-gray-500 line-through font-medium mb-1">
                                            $
                                            {product.regularPrice.toLocaleString(
                                                "es-AR",
                                            )}
                                        </span>
                                    )}
                                    <span className="text-4xl sm:text-5xl font-black text-green-400 tracking-tighter leading-none">
                                        $
                                        {pricing.finalPrice.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                    <span className="text-xs text-gray-400 mt-2">
                                        Precio s/imp. nac:{" "}
                                        <span className="text-gray-300">
                                            $
                                            {pricing.priceNoTax.toLocaleString(
                                                "es-AR",
                                            )}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Mostrar el descuento arriba en mobile para que no rompa el diseño */}
                            <div className="sm:hidden mt-4">
                                {discountPercentage > 0 && (
                                    <span className="border border-green-500/40 text-green-400 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-green-500/5">
                                        {discountPercentage}% OFF por medio de
                                        pago
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* CAJA PRECIO DE LISTA */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-400">
                                    Precio de lista
                                </span>
                                <span className="text-sm text-brand mt-1 flex items-center gap-1.5 font-semibold">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-4 h-4"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                                        />
                                    </svg>
                                    3 cuotas sin interés de $
                                    {(
                                        pricing.listPriceFinal / 3
                                    ).toLocaleString("es-AR", {
                                        maximumFractionDigits: 0,
                                    })}
                                </span>
                            </div>

                            <div className="flex flex-col items-end justify-center">
                                {product.salePrice && (
                                    <span className="text-xs text-gray-500 line-through mb-0.5">
                                        $
                                        {pricing.listPrice.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                )}
                                <span className="text-xl font-bold text-gray-200">
                                    $
                                    {pricing.listPriceFinal.toLocaleString(
                                        "es-AR",
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* ================= BADGE ENVÍO GRATIS ================= */}
                        {product.hasFreeShipping && (
                            <div className="mt-2 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 rounded-lg w-fit">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                    <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                                </svg>
                                <span className="text-sm font-bold tracking-wide">
                                    Llega gratis a todo el país
                                </span>
                            </div>
                        )}
                    </div>

                    {product.shortDescription && (
                        <div
                            className="text-sm text-gray-400 prose prose-sm prose-invert max-w-none"
                            dangerouslySetInnerHTML={{
                                __html: product.shortDescription,
                            }}
                        />
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-800">
                        {product.isOutlet ? (
                            <OutletSelector
                                product={product}
                                units={outletUnits}
                            />
                        ) : (
                            <>
                                {product.availableStock &&
                                product.availableStock <= 0 ? (
                                    <p className="text-sm text-red-500 font-medium stock-color mb-4">
                                        Sin stock
                                    </p>
                                ) : (
                                    <p className="text-sm text-green-400 font-medium mb-4">
                                        {product.availableStock} unidades
                                        disponibles
                                    </p>
                                )}
                                <AddToCartButton product={product} />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ProductSchema product={product} />
        </main>
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
        return {
            title: "Producto no encontrado",
        };
    }

    const cleanDescription = product.shortDescription
        ?.replace(/<[^>]*>/g, "")
        .slice(0, 160);

    return {
        metadataBase: new URL("https://mgrtechno.com.ar"),
        title: product.name,
        description:
            cleanDescription ||
            `Comprá ${product.name} al mejor precio en MGR Techno`,
        alternates: {
            canonical: `/productos/${product.slug}`,
        },
        openGraph: {
            title: product.name,
            description:
                cleanDescription ||
                `Comprá ${product.name} al mejor precio en MGR Techno`,
            url: `https://mgrtechno.com.ar/productos/${product.slug}`,
            siteName: "MGR Techno",
            type: "website",
            images:
                getOptimizedImageUrl(product.image) ||
                getOptimizedImageUrl(product.images?.[0] || "")
                    ? [
                          {
                              url:
                                  getOptimizedImageUrl(product.image) ||
                                  getOptimizedImageUrl(product.images[0]),
                              width: 800,
                              height: 800,
                              alt: product.name,
                          },
                      ]
                    : [],
        },
        twitter: {
            card: "summary_large_image",
            title: product.name,
            description:
                cleanDescription ||
                `Comprá ${product.name} al mejor precio en MGR Techno`,
            images:
                getOptimizedImageUrl(product.image) ||
                getOptimizedImageUrl(product.images?.[0] || "")
                    ? [
                          getOptimizedImageUrl(product.image) ||
                              getOptimizedImageUrl(product.images[0]),
                      ]
                    : [],
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-image-preview": "large",
                "max-snippet": -1,
                "max-video-preview": -1,
            },
        },
    };
}
