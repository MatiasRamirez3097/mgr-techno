"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/product";
import { useCart } from "@/store/cart";
import { useCartDrawer } from "@/components/layout/CartDrawerProvider";

export function ProductCard({ product }: { product: Product }) {
    const addToCart = useCart((state) => state.addToCart);
    const { open } = useCartDrawer();
    const items = useCart((state) => state.items);

    const itemInCart = items.find((i) => i.id === product.id);
    const maxStock = product.stock ?? Infinity;
    const reachedMax = itemInCart ? itemInCart.quantity >= maxStock : false;
    const disabled = product.stock === 0 || reachedMax;

    const handleAdd = () => {
        if (disabled) return;
        addToCart(product);
        open();
    };

    return (
        <div className="group relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900 hover:border-brand transition-colors">
            <Link href={`/products/${product.slug}`}>
                <div className="relative aspect-square bg-gray-800">
                    <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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

            <div className="px-3 pb-3">
                <button
                    onClick={handleAdd}
                    disabled={disabled}
                    className="w-full py-2 rounded-lg text-sm font-medium text-white bg-brand hover:brightness-110 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all"
                >
                    {product.stock === 0
                        ? "Sin stock"
                        : reachedMax
                          ? "Máximo disponible"
                          : "Agregar al carrito"}
                </button>
            </div>
        </div>
    );
}
