export const revalidate = 3600;

import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { ProductSchema } from "@/components/products/ProductSchema";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { smartTitleCase, cleanMetaDescription } from "@/lib/utils/seoUtils";
import { AddToCartButton } from "@/components/products/AddToCartButton";
import { ProductGallery } from "@/components/products/ProductGallery";
import MetaProductView from "@/components/MetaProductView";
import { OutletSelector } from "@/components/products/OutletSelector";
import { ProductShippingCalculator } from "@/components/products/ProductShippingCalculator";

import { getPricing } from "@/lib/pricing";
import { getProductBySlug as getProductBySlugService } from "@/services/products/getProductBySlug";

import { connectDB } from "@/lib/mongodb";
import { InventoryItemModel } from "@/models/InventoryItem";
import {
    getOptimizedImageUrl,
    hasOwnProductImage,
} from "@/lib/utils/imageUtils";

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
                    bundleItems={product.bundleItems}
                    hasOwnMainImage={hasOwnProductImage(product.image)}
                />

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {product.type === "bundle" && (
                            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Combo ahorro
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold title-color">
                        {product.name}
                    </h1>

                    {/* ================= SECCIÓN DE PRECIOS UNIFICADA ================= */}
                    <div className="flex flex-col mt-4 border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
                        {/* --- CAJA PRINCIPAL (Efectivo/Transferencia) --- */}
                        <div className="bg-gray-900 p-6 relative">
                            {/* Brillo de fondo sutil */}
                            <div className="absolute top-0 right-0 w-40 h-40 bg-brand/5 blur-3xl rounded-full pointer-events-none"></div>

                            {/* Fila 1: Badges */}
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <span className="bg-brand text-white font-black text-xs px-3 py-1.5 rounded uppercase tracking-wider">
                                    Mejor Precio
                                </span>
                                {discountPercentage > 0 && (
                                    <span className="border border-gray-700 text-gray-400 text-xs font-bold px-2.5 py-1 rounded">
                                        -{discountPercentage}% OFF
                                    </span>
                                )}
                            </div>

                            {/* Fila 2: Precios */}
                            <div className="flex flex-col mb-3 relative z-10">
                                {product.salePrice && (
                                    <span className="text-gray-500 line-through font-medium text-sm mb-1">
                                        $
                                        {product.regularPrice.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                )}
                                <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter leading-none">
                                    $
                                    {pricing.finalPrice.toLocaleString("es-AR")}
                                </span>
                            </div>

                            {/* Fila 3: Método y Detalles */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative z-10">
                                <div className="flex items-center gap-2 text-brand font-semibold text-sm">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    Efectivo / Transferencia
                                </div>
                                <span className="hidden sm:block text-gray-700">
                                    |
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                    Precio s/imp. nac:{" "}
                                    <span className="text-gray-400">
                                        $
                                        {pricing.priceNoTax.toLocaleString(
                                            "es-AR",
                                        )}
                                    </span>
                                </span>
                            </div>
                        </div>

                        {/* --- CAJA SECUNDARIA (Mercado Pago / Lista) --- */}
                        <div className="bg-black p-5 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm text-gray-400 font-medium">
                                    Precio de lista
                                </span>
                                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="w-5 h-5 text-brand"
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
                                </div>
                            </div>

                            <div className="text-2xl font-bold text-gray-300">
                                $
                                {pricing.listPriceFinal.toLocaleString("es-AR")}
                            </div>
                        </div>
                    </div>

                    {/* ================= BADGE ENVÍO GRATIS ================= */}
                    {product.hasFreeShipping && (
                        <div className="mt-2 inline-flex items-center gap-2 text-brand px-1 py-2 w-fit">
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

                    {product.type === "bundle" &&
                        product.bundleItems &&
                        product.bundleItems.length > 0 && (
                            <div className="mt-2 rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-brand mb-3">
                                    📦 Este combo incluye:
                                </p>
                                <ul className="space-y-2.5 text-sm text-gray-300">
                                    {product.bundleItems.map((bi) => (
                                        <li
                                            key={bi.productId}
                                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-gray-800/40 border border-gray-800/80 hover:border-gray-700 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {hasOwnProductImage(bi.image) ? (
                                                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shrink-0">
                                                        <Image
                                                            src={getOptimizedImageUrl(
                                                                bi.image!,
                                                                200,
                                                            )}
                                                            alt={
                                                                bi.name ||
                                                                "Componente"
                                                            }
                                                            fill
                                                            sizes="44px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-11 h-11 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                                                        {bi.quantity}x
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-brand text-xs px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20 shrink-0">
                                                            {bi.quantity}x
                                                        </span>
                                                        {bi.slug ? (
                                                            <Link
                                                                href={`/productos/${bi.slug}`}
                                                                className="font-medium text-white hover:text-brand transition-colors truncate"
                                                            >
                                                                {bi.name ||
                                                                    "Producto incluido"}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-medium text-white truncate">
                                                                {bi.name ||
                                                                    "Producto incluido"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {typeof bi.regularPrice ===
                                                        "number" &&
                                                        bi.regularPrice > 0 && (
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                Valor individual:{" "}
                                                                $
                                                                {bi.regularPrice.toLocaleString(
                                                                    "es-AR",
                                                                )}
                                                                {bi.quantity > 1
                                                                    ? " c/u"
                                                                    : ""}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>
                                            {bi.slug && (
                                                <Link
                                                    href={`/productos/${bi.slug}`}
                                                    title="Ver producto individual"
                                                    className="text-xs text-gray-400 hover:text-brand transition-colors shrink-0 px-2 py-1"
                                                >
                                                    Ver →
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

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
                                {typeof product.availableStock === "number" && product.availableStock <= 0 ? (
                                    <p className="text-sm text-red-500 font-medium stock-color mb-4">
                                        Sin stock
                                    </p>
                                ) : (
                                    <p className="text-sm text-green-400 font-medium mb-4">
                                        {typeof product.availableStock === "number"
                                            ? `${product.availableStock} ${product.availableStock === 1 ? "unidad disponible" : "unidades disponibles"}`
                                            : "En stock"}
                                    </p>
                                )}
                                <AddToCartButton product={product} />
                            </>
                        )}

                        <ProductShippingCalculator
                            productId={product.id}
                            hasFreeShipping={product.hasFreeShipping}
                        />
                    </div>
                </div>
            </div>

            {/* ================= ESPECIFICACIONES TÉCNICAS ================= */}
            {((product.attributes && product.attributes.length > 0) ||
                (product.type === "bundle" &&
                    product.bundleItems?.some(
                        (bi) => bi.attributes && bi.attributes.length > 0,
                    ))) && (
                <section className="mt-12 pt-8 border-t border-gray-800 space-y-6">
                    <h2 className="text-xl font-bold text-white">
                        Especificaciones Técnicas
                    </h2>

                    {product.attributes && product.attributes.length > 0 && (
                        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
                            <dl className="divide-y divide-gray-800/80 grid grid-cols-1 md:grid-cols-2">
                                {product.attributes.map((attr) => {
                                    let formattedVal = "";
                                    if (typeof attr.value === "boolean") {
                                        formattedVal = attr.value ? "Sí" : "No";
                                    } else if (Array.isArray(attr.value)) {
                                        formattedVal = attr.value.join(", ");
                                    } else {
                                        formattedVal = String(attr.value ?? "");
                                    }
                                    if (attr.unit && formattedVal) {
                                        formattedVal = `${formattedVal} ${attr.unit}`;
                                    }

                                    return (
                                        <div
                                            key={attr.key}
                                            className="px-5 py-3.5 flex items-center justify-between gap-4 border-b md:odd:border-r border-gray-800/80"
                                        >
                                            <dt className="text-sm text-gray-400 font-medium">
                                                {attr.label}
                                            </dt>
                                            <dd className="text-sm text-white font-semibold text-right">
                                                {formattedVal}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        </div>
                    )}

                    {product.type === "bundle" &&
                        product.bundleItems?.map((bi) => {
                            if (!bi.attributes || bi.attributes.length === 0) {
                                return null;
                            }
                            return (
                                <div
                                    key={bi.productId}
                                    className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden"
                                >
                                    <div className="px-5 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <span className="text-brand">
                                                {bi.quantity}x
                                            </span>
                                            <span>
                                                {bi.name || "Componente"}
                                            </span>
                                        </h3>
                                    </div>
                                    <dl className="divide-y divide-gray-800/80 grid grid-cols-1 md:grid-cols-2">
                                        {bi.attributes.map((attr) => {
                                            let formattedVal = "";
                                            if (
                                                typeof attr.value === "boolean"
                                            ) {
                                                formattedVal = attr.value
                                                    ? "Sí"
                                                    : "No";
                                            } else if (
                                                Array.isArray(attr.value)
                                            ) {
                                                formattedVal =
                                                    attr.value.join(", ");
                                            } else {
                                                formattedVal = String(
                                                    attr.value ?? "",
                                                );
                                            }
                                            if (attr.unit && formattedVal) {
                                                formattedVal = `${formattedVal} ${attr.unit}`;
                                            }

                                            return (
                                                <div
                                                    key={attr.key}
                                                    className="px-5 py-3.5 flex items-center justify-between gap-4 border-b md:odd:border-r border-gray-800/80"
                                                >
                                                    <dt className="text-sm text-gray-400 font-medium">
                                                        {attr.label}
                                                    </dt>
                                                    <dd className="text-sm text-white font-semibold text-right">
                                                        {formattedVal}
                                                    </dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                </div>
                            );
                        })}
                </section>
            )}

            <BreadcrumbSchema
                items={[
                    { name: "Inicio", url: "https://mgrtechno.com.ar" },
                    { name: "Productos", url: "https://mgrtechno.com.ar/productos" },
                    {
                        name: smartTitleCase(product.name),
                        url: `https://mgrtechno.com.ar/productos/${product.slug}`,
                    },
                ]}
            />
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

    const formattedTitle = smartTitleCase(product.name);
    const cleanDescription = cleanMetaDescription(
        product.shortDescription || product.description,
        `Comprá ${formattedTitle} al mejor precio en MGR Techno. Envíos a todo el país y garantía oficial.`,
    );

    const fallbackBundleImg =
        product.bundleItems?.find((bi) => hasOwnProductImage(bi.image))
            ?.image || "";
    const metaImageUrl =
        getOptimizedImageUrl(product.image, 1000) ||
        getOptimizedImageUrl(product.images?.[0] || "", 1000) ||
        getOptimizedImageUrl(fallbackBundleImg, 1000);

    return {
        metadataBase: new URL("https://mgrtechno.com.ar"),
        title: formattedTitle,
        description: cleanDescription,
        alternates: {
            canonical: `/productos/${product.slug}`,
        },
        openGraph: {
            title: formattedTitle,
            description: cleanDescription,
            url: `https://mgrtechno.com.ar/productos/${product.slug}`,
            siteName: "MGR Techno",
            type: "website",
            images: metaImageUrl
                ? [
                      {
                          url: metaImageUrl,
                          width: 800,
                          height: 800,
                          alt: formattedTitle,
                      },
                  ]
                : [],
        },
        twitter: {
            card: "summary_large_image",
            title: formattedTitle,
            description: cleanDescription,
            images: metaImageUrl ? [metaImageUrl] : [],
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
