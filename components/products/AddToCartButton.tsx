"use client";

import { useCart } from "@/store/cart";
import { useCartDrawer } from "@/components/layout/CartDrawerProvider";
import { ProductDTO } from "@/types/shared/product";

export function AddToCartButton({ product }: { product: ProductDTO }) {
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
        <button
            onClick={() => handleAdd()}
            disabled={disabled}
            className="bg-brand mt-auto w-full py-3 px-6 rounded-xl font-medium text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
            {product.stock === 0
                ? "Sin stock"
                : reachedMax
                  ? "Máximo disponible"
                  : "Agregar al carrito"}
        </button>
    );
}
