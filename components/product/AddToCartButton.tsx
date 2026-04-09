"use client";

import { useCart } from "@/store/cart";
import { Product } from "@/types/product";

export function AddToCartButton({ product }: { product: Product }) {
    const addToCart = useCart((state) => state.addToCart);

    const disabled = product.stock === 0;

    return (
        <button
            onClick={() => addToCart(product)}
            disabled={disabled}
            className="mt-auto w-full py-3 px-6 rounded-xl font-medium text-white bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
            {disabled ? "Sin stock" : "Agregar al carrito"}
        </button>
    );
}
