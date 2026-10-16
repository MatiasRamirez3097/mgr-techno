"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductDTO } from "@/types/shared/product";
import { useCart } from "@/store/cart";
import { useCartDrawer } from "@/components/layout/CartDrawerProvider";
import { getPricing } from "@/lib/pricing";
import { getOptimizedImageUrl } from "@/lib/utils/imageUtils";

export function ProductCard({
    product,
    priority = false,
}: {
    // Extendemos temporalmente para incluir los campos si tu DTO aún no los tiene
    product: ProductDTO & { isOutlet?: boolean; hasFreeShipping?: boolean };
    priority?: boolean;
}) {
    const router = useRouter();
    const addToCart = useCart((state) => state.addToCart);
    const { open } = useCartDrawer();
    const items = useCart((state) => state.items);

    const itemInCart = items.find((i) => i.id === product.id);
    const maxStock = product.availableStock ?? Infinity;
    const reachedMax = itemInCart ? itemInCart.quantity >= maxStock : false;
    const disabled = product.availableStock === 0 || reachedMax;
    const pricing = getPricing(product);

    const handleAction = (e: React.MouseEvent) => {
        if (disabled) return;

        if (product.isOutlet) {
            router.push(`/productos/${product.slug}`);
            return;
        }

        e.preventDefault();
        addToCart(product);
        open();
    };

    return (
        <div className="group relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900 hover:border-brand transition-colors flex flex-col h-full">
            <Link
                href={`/productos/${product.slug}`}
                className="flex-1 flex flex-col"
            >
                <div className="relative aspect-square bg-gray-800 shrink-0 flex items-center justify-center">
                    {product.image ? (
                        <Image
                            src={getOptimizedImageUrl(product.image)}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            priority={priority}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-600 p-4">
                            <svg
                                className="w-10 h-10 mb-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">MGR TECHNO</span>
                        </div>
                    )}
                    {/* Contenedor de etiquetas */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
                        {product.isOutlet && (
                            <span className="bg-purple-900/80 text-purple-200 border border-purple-500/50 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                                Outlet
                            </span>
                        )}
                        {product.salePrice && (
                            <span className="bg-brand text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg shadow-brand/20 uppercase tracking-wider">
                                Oferta
                            </span>
                        )}
                        {/* NUEVO: Etiqueta de Envío Gratis */}
                        {product.hasFreeShipping && (
                            <span className="bg-green-600/90 text-white border border-green-500/50 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                                Envío Gratis
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                    <p className="text-sm font-medium text-gray-100 line-clamp-3">
                        {product.name}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-base font-bold text-white">
                            ${pricing.finalPrice.toLocaleString("es-AR")}
                        </span>
                        {product.salePrice && (
                            <span className="text-sm text-gray-500 line-through">
                                ${product.regularPrice.toLocaleString("es-AR")}
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            <div className="px-3 pb-3 shrink-0">
                <button
                    onClick={handleAction}
                    disabled={disabled && !product.isOutlet}
                    className="w-full py-2 rounded-lg text-sm font-medium text-white bg-brand hover:brightness-110 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                >
                    {product.availableStock === 0
                        ? "Sin stock"
                        : product.isOutlet
                          ? "Ver detalles del Outlet"
                          : reachedMax
                            ? "Máximo disponible"
                            : "Agregar al carrito"}
                </button>
            </div>
        </div>
    );
}
