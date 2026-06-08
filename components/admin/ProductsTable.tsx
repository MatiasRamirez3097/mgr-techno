"use client";

import React from "react";
import { useState } from "react";

import Link from "next/link";

import Image from "next/image";

import { QuickEditProduct } from "./QuickEditProduct";

import { getPricing } from "@/lib/pricing";

import { getProductHealth } from "@/lib/products/getProductHealth";

import { useSearchParams } from "next/navigation";

import type { ProductDTO } from "@/types/shared/product";

interface Props {
    products: ProductDTO[];
}

export function ProductsTable({ products }: Props) {
    const searchParams = useSearchParams();
    const [quickEditId, setQuickEditId] = useState<string | null>(null);

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
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4" />
                </tr>
            </thead>

            <tbody>
                {products.length === 0 ? (
                    <tr>
                        <td
                            colSpan={6}
                            className="
                                px-6
                                py-12
                                text-center
                                text-gray-400
                                text-sm
                            "
                        >
                            No se encontraron productos
                        </td>
                    </tr>
                ) : (
                    products.map((product) => {
                        console.log("product>>>", product);
                        const health = getProductHealth(product);
                        const pricing = getPricing({
                            regularPrice: product.regularPrice,

                            salePrice: product.salePrice,
                        });

                        const hasSale = Boolean(product.salePrice);

                        return (
                            <React.Fragment key={product.id}>
                                <tr
                                    key={product.id}
                                    className="
                                        border-b
                                        border-gray-800
                                        hover:bg-gray-800/50
                                        transition-colors
                                    "
                                >
                                    {/* PRODUCT */}

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="
                                                relative
                                                w-10
                                                h-10
                                                rounded-lg
                                                overflow-hidden
                                                bg-gray-800
                                                shrink-0
                                            "
                                            >
                                                {product.image && (
                                                    <Image
                                                        src={product.image}
                                                        alt={product.name}
                                                        fill
                                                        sizes="40px"
                                                        className="object-cover"
                                                    />
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p
                                                        className="
                                                        text-sm
                                                        text-white
                                                        font-medium
                                                        line-clamp-1
                                                    "
                                                    >
                                                        {product.name}
                                                    </p>

                                                    {product.featured && (
                                                        <span className="text-xs text-amber-400">
                                                            ★
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
                                            <p
                                                className="
                                                text-xs
                                                text-gray-400
                                                line-through
                                            "
                                            >
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
                                            className={`
                                                text-xs
                                                font-medium
                                                px-2.5
                                                py-1
                                                rounded-full
                                                border
                                                ${
                                                    product.availableStock &&
                                                    product.availableStock > 0
                                                        ? "text-green-400 bg-green-400/10 border-green-400/20"
                                                        : "text-red-400 bg-red-400/10 border-red-400/20"
                                                }
                                            `}
                                        >
                                            {product.availableStock &&
                                            product.availableStock > 0
                                                ? `En stock (${product.availableStock})`
                                                : "Sin stock"}
                                        </span>
                                    </td>

                                    {/* STATUS */}

                                    <td className="px-6 py-4">
                                        <span
                                            className={`
                                                text-xs
                                                font-medium
                                                px-2.5
                                                py-1
                                                rounded-full
                                                border
                                                ${
                                                    product.status === "publish"
                                                        ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                                                        : "text-gray-400 bg-gray-400/10 border-gray-400/20"
                                                }
                                            `}
                                        >
                                            {product.status === "publish"
                                                ? "Publicado"
                                                : "Borrador"}
                                        </span>
                                    </td>

                                    {/* HEALTH */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`
                    text-xs
                    font-semibold
                    ${
                        health.score >= 90
                            ? "text-green-400"
                            : health.score >= 70
                              ? "text-yellow-400"
                              : "text-red-400"
                    }
                `}
                                                >
                                                    {health.score}%
                                                </span>

                                                {health.critical.length > 0 && (
                                                    <span
                                                        className="
                        text-red-400
                        bg-red-400/10
                        border
                        border-red-400/20
                        px-2
                        py-0.5
                        rounded-full
                        text-xs
                    "
                                                    >
                                                        {health.critical.length}{" "}
                                                        críticos
                                                    </span>
                                                )}

                                                {health.warnings.length > 0 && (
                                                    <span
                                                        className="
                        text-yellow-400
                        bg-yellow-400/10
                        border
                        border-yellow-400/20
                        px-2
                        py-0.5
                        rounded-full
                        text-xs
                    "
                                                    >
                                                        {health.warnings.length}{" "}
                                                        avisos
                                                    </span>
                                                )}
                                            </div>

                                            {(health.critical.length > 0 ||
                                                health.warnings.length > 0) && (
                                                <div className="flex flex-wrap gap-1">
                                                    {health.critical.map(
                                                        (item) => (
                                                            <span
                                                                key={item}
                                                                className="
                            text-[10px]
                            text-red-400
                        "
                                                            >
                                                                • {item}
                                                            </span>
                                                        ),
                                                    )}

                                                    {health.warnings.map(
                                                        (item) => (
                                                            <span
                                                                key={item}
                                                                className="
                            text-[10px]
                            text-yellow-400
                        "
                                                            >
                                                                • {item}
                                                            </span>
                                                        ),
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* ACTIONS */}

                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() =>
                                                    setQuickEditId(
                                                        quickEditId ===
                                                            product.id
                                                            ? null
                                                            : product.id,
                                                    )
                                                }
                                                className={`
                                                    text-xs
                                                    transition-all
                                                    ${
                                                        quickEditId ===
                                                        product.id
                                                            ? "text-white"
                                                            : "text-gray-400 hover:text-white"
                                                    }
                                                `}
                                            >
                                                ✏ Edición rápida
                                            </button>

                                            <Link
                                                href={`/admin/products/${product.id}?${searchParams.toString()}`}
                                                className="
                                                    text-xs
                                                    text-brand
                                                    hover:brightness-125
                                                    transition-all
                                                "
                                            >
                                                Editar →
                                            </Link>
                                        </div>
                                    </td>
                                </tr>

                                {/* QUICK EDIT */}

                                {quickEditId === product.id && (
                                    <tr
                                        key={`qe-${product.id}`}
                                        className="bg-gray-800/30"
                                    >
                                        <td colSpan={6} className="px-6 py-4">
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
