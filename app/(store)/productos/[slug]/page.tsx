export const revalidate = 3600;

import type { Metadata } from "next";

import { cache } from "react";
import { notFound } from "next/navigation";

import { ProductSchema } from "@/components/products/ProductSchema";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { ProductGallery } from "@/components/products/ProductGallery";

import { getPricing } from "@/lib/pricing";

import { getProductBySlug as getProductBySlugService } from "@/services/products/getProductBySlug";
import MetaProductView from "@/components/MetaProductView";

interface Props {
    params: Promise<{
        slug: string;
    }>;
}

// =========================
// CACHE
// =========================

const getProductBySlug = cache(async (slug: string) => {
    return getProductBySlugService(slug);
});

// =========================
// PAGE
// =========================

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

    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <MetaProductView
                productId={product.id}
                price={product.effectivePrice}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* GALLERY */}

                <ProductGallery
                    images={[product.image, ...(product.images || [])].filter(
                        Boolean,
                    )}
                    name={product.name}
                />

                {/* INFO */}

                <div className="flex flex-col gap-4">
                    {/* TITLE */}

                    <h1 className="text-2xl font-bold title-color">
                        {product.name}
                    </h1>

                    {/* ========================= */}
                    {/* PRICING */}
                    {/* ========================= */}

                    <div className="flex flex-col gap-2">
                        {/* SPECIAL PRICE */}

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-brand font-medium w-28">
                                Precio especial:
                            </span>

                            <div className="flex items-center gap-3">
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
                            </div>
                        </div>

                        {/* LIST PRICE */}

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

                        {/* NO TAX */}

                        <p className="text-xs text-gray-600 mt-1">
                            Precio sin impuestos nacionales: $
                            {pricing.priceNoTax.toLocaleString("es-AR")}
                        </p>
                    </div>

                    {/* ========================= */}
                    {/* DESCRIPTION */}
                    {/* ========================= */}

                    {product.shortDescription && (
                        <div
                            className="
                                text-sm
                                text-gray-600
                                prose
                                prose-sm
                                max-w-none
                            "
                            dangerouslySetInnerHTML={{
                                __html: product.shortDescription,
                            }}
                        />
                    )}

                    {/* ========================= */}
                    {/* STOCK */}
                    {/* ========================= */}

                    {product.availableStock && product.availableStock <= 0 ? (
                        <p className="text-sm text-red-500 font-medium stock-color">
                            Sin stock
                        </p>
                    ) : (
                        <p className="text-sm text-red-300 font-medium stock-color">
                            {product.availableStock} unidades disponibles
                        </p>
                    )}

                    {/* ========================= */}
                    {/* ADD TO CART */}
                    {/* ========================= */}

                    <AddToCartButton product={product} />
                </div>
            </div>

            {/* ========================= */}
            {/* SEO SCHEMA */}
            {/* ========================= */}

            <ProductSchema product={product} />
        </main>
    );
}

// =========================
// METADATA
// =========================

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
                product.image || product.images?.[0]
                    ? [
                          {
                              url: product.image || product.images[0],

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
                product.image || product.images?.[0]
                    ? [product.image || product.images[0]]
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
