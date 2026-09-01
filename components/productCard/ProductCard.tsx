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
                <div className="relative aspect-square bg-gray-800 shrink-0">
                    <Image
                        src={getOptimizedImageUrl(product.image)}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        priority={priority}
                    />
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
