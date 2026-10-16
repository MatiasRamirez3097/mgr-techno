"use client";

import { useCart } from "@/store/cart";
import { useCartDrawer } from "@/components/layout/CartDrawerProvider";
import { ProductDTO } from "@/types/shared/product";
import { trackAddToCart } from "@/lib/metaPixel";

export function AddToCartButton({ product }: { product: ProductDTO }) {
    const addToCart = useCart((state) => state.addToCart);
    const { open } = useCartDrawer();

    const items = useCart((state) => state.items);
    const itemInCart = items.find((i) => i.id === product.id);
    const maxStock = product.availableStock ?? Infinity;
    const reachedMax = itemInCart ? itemInCart.quantity >= maxStock : false;
    const disabled = product.availableStock === 0 || reachedMax;

    const handleAdd = () => {
        if (disabled) return;
        addToCart(product);
        trackAddToCart(product, 1);
        open();
    };

    return (
        <button
            onClick={() => handleAdd()}
            disabled={disabled}
            className="bg-brand mt-auto w-full py-3 px-6 rounded-xl font-medium text-white hover:brightness-110 disabled:bg-gray-800 disabled:text-gray-500 disabled:border disabled:border-gray-700/60 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand/20 disabled:shadow-none"
        >
            {product.availableStock === 0
                ? "Sin stock"
                : reachedMax
                  ? "Máximo disponible"
                  : "Agregar al carrito"}
        </button>
    );
}
