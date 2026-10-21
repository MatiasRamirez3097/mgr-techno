"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { QuickEditProduct } from "./QuickEditProduct";
import { getPricing } from "@/lib/pricing";
import { getProductHealth } from "@/services/products/getProductHealth";
import type { ProductDTO } from "@/types/shared/product";
import type { CategoryDTO } from "@/types/shared/category";
import { getOptimizedImageUrl } from "@/lib/utils/imageUtils";
import { BundleImageCollage } from "@/components/products/BundleImageCollage";

interface Props {
    products: ProductDTO[];
    categories?: CategoryDTO[];
}

const PRODUCT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    publish: {
        label: "Publicado",
        color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    },
    pending_review: {
        label: "Pendiente revisión",
        color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    },
    draft: {
        label: "Borrador",
        color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
    },
    private: {
        label: "Privado",
        color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    },
};

export function ProductsTable({ products, categories = [] }: Props) {
    const searchParams = useSearchParams();
    const [quickEditId, setQuickEditId] = useState<string | null>(null);
    const router = useRouter();

    const handleCreateOutlet = async (baseProductId: string) => {
        if (
            !confirm(
                "¿Crear versión Outlet de este producto? Se generará un borrador copiando los datos base.",
            )
        )
            return;

        try {
            const res = await fetch(
                `/api/admin/products/${baseProductId}/duplicate-to-outlet`,
                {
                    method: "POST",
                },
            );

            if (res.ok) {
                const newOutletProduct = await res.json();
                router.push(`/admin/products/${newOutletProduct.id}`);
            } else {
                alert("Error al crear el producto de outlet");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <table className="w-full">
            <thead>
                <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                        Producto
                    </th>
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                        SKU
                    </th>
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                        Precio
                    </th>
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                        Stock
                    </th>
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                        Estado
                    </th>
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                        Calidad
                    </th>
                    <th className="text-right text-xs text-gray-400 font-medium px-6 py-4">
                        Acciones
                    </th>
                </tr>
            </thead>

            <tbody>
                {products.length === 0 ? (
                    <tr>
                        <td
                            colSpan={7}
                            className="px-6 py-12 text-center text-gray-400 text-sm"
                        >
                            No se encontraron productos
                        </td>
                    </tr>
                ) : (
                    products.map((product) => {
                        const health = getProductHealth(product, categories);
                        const pricing = getPricing({
                            regularPrice: product.regularPrice,
                            salePrice: product.salePrice,
                        });

                        const hasSale = Boolean(product.salePrice);
                        const hasMissingRequiredAttr =
                            health.missingAttributes.some((a) => a.required);
                        const missingAttrTooltip =
                            health.missingAttributes.length > 0
                                ? `Faltan atributos de categoría: ${health.missingAttributes
                                      .map(
                                          (a) =>
                                              `${a.label}${a.required ? " (obligatorio)" : ""}`,
                                      )
                                      .join(", ")}`
                                : "";

                        return (
                            <React.Fragment key={product.id}>
                                <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                    {/* PRODUCT */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                                                {product.image ? (
                                                    <Image
                                                        src={getOptimizedImageUrl(
                                                            product.image,
                                                            300,
                                                        )}
                                                        alt={product.name}
                                                        fill
                                                        sizes="40px"
                                                        className="object-cover"
                                                    />
                                                ) : product.type === "bundle" &&
                                                  product.bundleItems?.length ? (
                                                    <BundleImageCollage
                                                        bundleItems={
                                                            product.bundleItems
                                                        }
                                                        alt={product.name}
                                                        compact
                                                        imageWidth={150}
                                                    />
                                                ) : null}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-white font-medium line-clamp-1">
                                                        {product.name}
                                                    </p>

                                                    {product.featured && (
                                                        <span className="text-xs text-amber-400">
                                                            ★
                                                        </span>
                                                    )}

                                                    {product.isOutlet && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                            OUTLET
                                                        </span>
                                                    )}

                                                    {product.type === "bundle" && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                            COMBO
                                                            {product.bundleItemsCount
                                                                ? ` (${product.bundleItemsCount})`
                                                                : ""}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-xs text-gray-400">
                                                    #{product.id}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* SKU */}
                                    <td className="px-6 py-4 text-sm text-gray-400">
                                        {product.sku || "—"}
                                    </td>

                                    {/* PRICE */}
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-white">
                                            $
                                            {pricing.finalPrice.toLocaleString(
                                                "es-AR",
                                            )}
                                        </p>

                                        {hasSale && (
                                            <p className="text-xs text-gray-400 line-through">
                                                $
                                                {product.regularPrice.toLocaleString(
                                                    "es-AR",
                                                )}
                                            </p>
                                        )}
                                    </td>

                                    {/* STOCK */}
                                    <td className="px-6 py-4">
                                        <span
                                            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                                                product.availableStock &&
                                                product.availableStock > 0
                                                    ? "text-green-400 bg-green-400/10 border-green-400/20"
                                                    : "text-red-400 bg-red-400/10 border-red-400/20"
                                            }`}
                                        >
                                            {product.availableStock &&
                                            product.availableStock > 0
                                                ? `En stock (${product.availableStock})`
                                                : "Sin stock"}
                                        </span>
                                    </td>

                                    {/* STATUS */}
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const statusConfig =
                                                PRODUCT_STATUS_CONFIG[
                                                    product.status
                                                ] || {
                                                    label:
                                                        product.status ||
                                                        "Borrador",
                                                    color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
                                                };
                                            return (
                                                <span
                                                    className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusConfig.color}`}
                                                >
                                                    {statusConfig.label}
                                                </span>
                                            );
                                        })()}
                                    </td>

                                    {/* HEALTH / CALIDAD */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span
                                                    className={`text-xs font-semibold ${
                                                        health.score >= 90
                                                            ? "text-green-400"
                                                            : health.score >= 70
                                                              ? "text-yellow-400"
                                                              : "text-red-400"
                                                    }`}
                                                >
                                                    {health.score}%
                                                </span>

                                                {health.critical.length > 0 && (
                                                    <span className="text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full text-[11px]">
                                                        {health.critical.length}{" "}
                                                        críticos
                                                    </span>
                                                )}

                                                {health.warnings.length > 0 && (
                                                    <span className="text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full text-[11px]">
                                                        {health.warnings.length}{" "}
                                                        avisos
                                                    </span>
                                                )}

                                                {/* HIGHLIGHT DE ATRIBUTOS DE CATEGORÍA FALTANTES */}
                                                {health.missingAttributes
                                                    .length > 0 && (
                                                    <span
                                                        title={
                                                            missingAttrTooltip
                                                        }
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-help ${
                                                            hasMissingRequiredAttr
                                                                ? "text-orange-300 bg-orange-500/15 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.15)]"
                                                                : "text-cyan-300 bg-cyan-500/15 border-cyan-500/30"
                                                        }`}
                                                    >
                                                        <span>⚙</span>
                                                        <span>
                                                            Faltan{" "}
                                                            {
                                                                health
                                                                    .missingAttributes
                                                                    .length
                                                            }{" "}
                                                            atrib.
                                                        </span>
                                                    </span>
                                                )}
                                            </div>

                                            {(health.critical.length > 0 ||
                                                health.warnings.length > 0 ||
                                                health.missingAttributes
                                                    .length > 0) && (
                                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 max-w-xs">
                                                    {health.critical.map(
                                                        (item) => (
                                                            <span
                                                                key={item}
                                                                className="text-[10px] text-red-400"
                                                            >
                                                                • {item}
                                                            </span>
                                                        ),
                                                    )}

                                                    {health.warnings.map(
                                                        (item) => (
                                                            <span
                                                                key={item}
                                                                className="text-[10px] text-yellow-400"
                                                            >
                                                                • {item}
                                                            </span>
                                                        ),
                                                    )}

                                                    {health.missingAttributes
                                                        .slice(0, 3)
                                                        .map((attr) => (
                                                            <span
                                                                key={attr.key}
                                                                title={
                                                                    missingAttrTooltip
                                                                }
                                                                className={`text-[10px] font-medium ${
                                                                    attr.required
                                                                        ? "text-orange-400"
                                                                        : "text-cyan-400"
                                                                }`}
                                                            >
                                                                • Sin{" "}
                                                                {attr.label}
                                                            </span>
                                                        ))}

                                                    {health.missingAttributes
                                                        .length > 3 && (
                                                        <span
                                                            title={
                                                                missingAttrTooltip
                                                            }
                                                            className="text-[10px] text-orange-300/80 underline decoration-dotted cursor-help"
                                                        >
                                                            +
                                                            {health
                                                                .missingAttributes
                                                                .length - 3}{" "}
                                                            atrib. más
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* ACTIONS (ICON BUTTONS) */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {/* Edición rápida */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setQuickEditId(
                                                        quickEditId ===
                                                            product.id
                                                            ? null
                                                            : product.id,
                                                    )
                                                }
                                                title="Edición rápida"
                                                aria-label="Edición rápida"
                                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                                                    quickEditId === product.id
                                                        ? "bg-brand text-white border-brand shadow-sm"
                                                        : "bg-gray-800/80 border-gray-700/80 text-gray-400 hover:text-white hover:bg-gray-700 hover:border-gray-600"
                                                }`}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={1.8}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                                                    />
                                                </svg>
                                            </button>

                                            {/* Editar producto */}
                                            <Link
                                                href={`/admin/products/${product.id}?${searchParams.toString()}`}
                                                title="Editar producto"
                                                aria-label="Editar producto"
                                                className="w-8 h-8 rounded-lg border bg-gray-800/80 border-gray-700/80 text-gray-300 hover:text-brand hover:bg-brand/10 hover:border-brand/40 flex items-center justify-center transition-all"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={1.8}
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                                    />
                                                </svg>
                                            </Link>

                                            {/* Duplicar a Outlet */}
                                            {!product.isOutlet && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleCreateOutlet(
                                                            product.id,
                                                        )
                                                    }
                                                    title="Duplicar a versión Outlet"
                                                    aria-label="Duplicar a versión Outlet"
                                                    className="w-8 h-8 rounded-lg border bg-purple-500/10 border-purple-500/25 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/40 flex items-center justify-center transition-all"
                                                >
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={1.8}
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                                                        />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>

                                {/* QUICK EDIT */}
                                {quickEditId === product.id && (
                                    <tr
                                        key={`qe-${product.id}`}
                                        className="bg-gray-800/30"
                                    >
                                        <td colSpan={7} className="px-6 py-4">
                                            <QuickEditProduct
                                                product={product}
                                                onClose={() =>
                                                    setQuickEditId(null)
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </tbody>
        </table>
    );
}
