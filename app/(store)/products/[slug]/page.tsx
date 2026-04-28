import type { Metadata } from "next";
import { ProductSchema } from "@/components/products/ProductSchema";
import { getProductsBySlug } from "@/lib/products/getProductsBySlug";
import { notFound } from "next/navigation";
import Image from "next/image";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { ProductGallery } from "@/components/products/ProductGallery";
import { getPricing } from "@/lib/pricing";

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: Props) {
    const { slug } = await params;
    const product = await getProductsBySlug(slug);

    if (!product) notFound();
    const pricing = getPricing({
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
    });
    return (
        <main className="max-w-5xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Imagen */}
                <ProductGallery images={product.images} name={product.name} />

                {/* Info */}
                <div className="flex flex-col gap-4">
                    <h1 className="text-2xl font-bold title-color">
                        {product.name}
                    </h1>

                    {/* Precio */}
                    <div className="flex flex-col gap-2">
                        {/* Precio especial */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-brand font-medium w-28">
                                Precio especial:
                            </span>
                            <div className="flex items-center gap-3">
                                {product.salePrice && (
                                    <span className="text-base text-gray-500 line-through">
                                        $
                                        {pricing.finalPrice.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                )}
                                <span className="text-3xl font-bold text-white">
                                    $
                                    {product.regularPrice.toLocaleString(
                                        "es-AR",
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Precio de lista */}
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

                        {/* Precio sin impuestos */}
                        <p className="text-xs text-gray-600 mt-1">
                            Precio sin impuestos nacionales: $
                            {pricing.priceNoTax.toLocaleString("es-AR")}
                        </p>
                    </div>

                    {/* Descripción (viene como HTML de Woo) */}
                    <div
                        className="text-sm text-gray-600 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                            __html: product.shortDescription,
                        }}
                    />

                    {/* Stock */}
                    {product.availableStock === 0 ? (
                        <p className="text-sm text-red-500 font-medium stock-color">
                            Sin stock
                        </p>
                    ) : (
                        <p className="text-sm text-red-300 font-medium stock-color">
                            {product.availableStock} unidades disponibles
                        </p>
                    )}

                    {/* Botón carrito — componente cliente */}
                    <AddToCartButton product={product} />
                </div>
            </div>
            <ProductSchema product={product} />
        </main>
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductsBySlug(slug);

    if (!product) return { title: "Producto no encontrado" };

    return {
        title: product.name,
        description: product.shortDescription
            ? product.shortDescription.replace(/<[^>]*>/g, "").slice(0, 160)
            : `Comprá ${product.name} al mejor precio en MGR Techno`,
        openGraph: {
            title: product.name,
            description: product.shortDescription
                ?.replace(/<[^>]*>/g, "")
                .slice(0, 160),
            images: product.image
                ? [
                      {
                          url: product.image,
                          width: 800,
                          height: 800,
                          alt: product.name,
                      },
                  ]
                : [],
            type: "website",
        },
    };
}
