"use client";
import React from "react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { QuickEditProduct } from "./QuickEditProduct";
import { getFinalPrice } from "@/lib/pricing";

export function ProductsTable({ products }: { products: any[] }) {
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
                    <th className="text-left text-xs text-gray-400 font-medium px-6 py-4"></th>
                </tr>
            </thead>
            <tbody>
                {products.length === 0 ? (
                    <tr>
                        <td
                            colSpan={6}
                            className="px-6 py-12 text-center text-gray-400 text-sm"
                        >
                            No se encontraron productos
                        </td>
                    </tr>
                ) : (
                    products.map((product: any) => (
                        <React.Fragment key={product.id}>
                            <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
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
                                                <p className="text-sm text-white font-medium line-clamp-1">
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
                                <td className="px-6 py-4 text-sm text-gray-400">
                                    {product.sku || "—"}
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-white">
                                        $
                                        {getFinalPrice({
                                            regularPrice: product.regularPrice,
                                            salePrice: product.salePrice,
                                        }).toLocaleString("es-AR")}
                                    </p>
                                    {product.onSale && (
                                        <p className="text-xs text-gray-400 line-through">
                                            $
                                            {parseFloat(
                                                product.regularPrice || "0",
                                            ).toLocaleString("es-AR")}
                                        </p>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                                            product.stockStatus === "instock"
                                                ? "text-green-400 bg-green-400/10 border-green-400/20"
                                                : "text-red-400 bg-red-400/10 border-red-400/20"
                                        }`}
                                    >
                                        {product.stockStatus === "instock"
                                            ? `En stock (${product.stockQuantity ?? "∞"})`
                                            : "Sin stock"}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                                            product.status === "publish"
                                                ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                                                : "text-gray-400 bg-gray-400/10 border-gray-400/20"
                                        }`}
                                    >
                                        {product.status === "publish"
                                            ? "Publicado"
                                            : "Borrador"}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() =>
                                                setQuickEditId(
                                                    quickEditId === product.id
                                                        ? null
                                                        : product._id,
                                                )
                                            }
                                            className={`text-xs transition-all ${
                                                quickEditId === product.id
                                                    ? "text-white"
                                                    : "text-gray-400 hover:text-white"
                                            }`}
                                        >
                                            ✏ Edición rápida
                                        </button>
                                        <Link
                                            href={`/admin/products/${product.id}`}
                                            className="text-xs text-brand hover:brightness-125 transition-all"
                                        >
                                            Editar →
                                        </Link>
                                    </div>
                                </td>
                            </tr>

                            {/* Fila del quick edit */}
                            {quickEditId === product._id && (
                                <tr
                                    key={`qe-${product._id}`}
                                    className="bg-gray-800/30"
                                >
                                    <td colSpan={6} className="px-6 py-4">
                                        <QuickEditProduct
                                            product={product}
                                            onClose={() => setQuickEditId(null)}
                                        />
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))
                )}
            </tbody>
        </table>
    );
}
