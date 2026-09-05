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

                    <div className="flex flex-col gap-2">
                        {/* ================= PRECIO ESPECIAL ================= */}
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-brand font-medium w-28 flex flex-col">
                                <span>Precio especial:</span>
                            </div>

                            {/* flex-wrap ayuda a que si la pantalla es chica, el badge baje ordenadamente */}
                            <div className="flex items-center flex-wrap gap-3">
                                {product.salePrice && (
                                    <span className="text-base text-gray-500 line-through">
                                        $
                                        {product.regularPrice.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                )}
                                <span className="text-3xl font-bold text-white">
                                    $
                                    {pricing.finalPrice.toLocaleString("es-AR")}
                                </span>

                                {/* 🔥 BADGE DE DESCUENTO */}
                                {discountPercentage > 0 && (
                                    <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.05)] ml-1">
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
                                        <span className="hidden sm:inline text-[11px] font-medium opacity-80 mt-0.5 ml-1">
                                            (con transferencia)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400 w-28">
                                Precio de lista:
                            </span>
                            <div className="flex items-center gap-2">
                                {product.salePrice && (
                                    <span className="text-sm text-gray-500 line-through">
                                        $
                                        {pricing.listPrice.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                )}
                                <span className="text-sm text-gray-300">
                                    $
                                    {pricing.listPriceFinal.toLocaleString(
                                        "es-AR",
                                    )}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 mt-1">
                            Precio sin impuestos nacionales: $
                            {pricing.priceNoTax.toLocaleString("es-AR")}
                        </p>

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
