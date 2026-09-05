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
                        {/* CAJA PRECIO ESPECIAL (Destacada) */}
                        <div className="bg-gray-800/40 border border-gray-700/60 border-l-4 border-l-brand rounded-xl p-5 shadow-sm relative">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-brand uppercase tracking-wider">
                                    Precio Especial
                                </span>
                                {/* Íconos decorativos sutiles */}
                                <div className="flex gap-2 text-gray-500">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            <div className="flex items-end gap-3 flex-wrap">
                                <span className="text-4xl font-extrabold text-white tracking-tight">
                                    $
                                    {pricing.finalPrice.toLocaleString("es-AR")}
                                </span>

                                {product.salePrice && (
                                    <span className="text-lg text-gray-500 line-through mb-1 font-medium">
                                        $
                                        {product.regularPrice.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                )}

                                {discountPercentage > 0 && (
                                    <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-lg mb-1.5">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="w-4 h-4"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.5 9.5a3 3 0 004.242 0l4.318-4.318a3 3 0 000-4.242l-9.5-9.5A3 3 0 009.568 2.25H5.25zm1.5 3a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span className="font-bold text-sm tracking-wide">
                                            {discountPercentage}% OFF
                                        </span>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-400 mt-2">
                                Abonando con{" "}
                                <strong className="text-gray-300 font-medium">
                                    Transferencia o Efectivo
                                </strong>
                            </p>
                        </div>

                        {/* CAJA PRECIO DE LISTA */}
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-300">
                                    Precio de lista
                                </span>
                                <span className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-3.5 h-3.5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                                        />
                                    </svg>
                                    Mercado Pago
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                {product.salePrice && (
                                    <span className="text-sm text-gray-600 line-through">
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

                        <p className="text-xs text-gray-600 px-1">
                            Precio sin impuestos nacionales: $
                            {pricing.priceNoTax.toLocaleString("es-AR")}
                        </p>

                        {/* ================= BADGE ENVÍO GRATIS ================= */}
                        {product.hasFreeShipping && (
                            <div className="mt-1 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 rounded-lg w-fit">
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
