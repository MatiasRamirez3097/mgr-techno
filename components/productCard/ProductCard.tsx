// components/productCard/ProductCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";
import { useCart } from "@/store/cart";

export function ProductCard({ product }: { product: Product }) {
    const addToCart = useCart((state) => state.addToCart);

    return (
        <div className="group relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900 hover:border-brand transition-colors">
            <Link href={`/products/${product.slug}`}>
                <div className="relative aspect-square bg-gray-800">
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {product.onSale && (
                        <span className="absolute top-2 left-2 bg-brand text-white text-xs font-medium px-2 py-1 rounded-full">
                            Oferta
                        </span>
                    )}
                </div>

                <div className="p-3">
                    <p className="text-sm font-medium text-gray-100 line-clamp-2 min-h-10">
                        {product.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-base font-bold text-white">
                            ${product.price.toLocaleString("es-AR")}
                        </span>
                        {product.onSale && (
                            <span className="text-sm text-gray-500 line-through">
                                ${product.regularPrice.toLocaleString("es-AR")}
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            {/* Botón fuera del Link para no anidar interactivos */}
            <div className="px-3 pb-3">
                <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                    className="w-full py-2 rounded-lg text-sm font-medium text-white bg-brand hover:brightness-110 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all"
                >
                    {product.stock === 0 ? "Sin stock" : "Agregar al carrito"}
                </button>
            </div>
        </div>
    );
}
