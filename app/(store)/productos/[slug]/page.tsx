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
