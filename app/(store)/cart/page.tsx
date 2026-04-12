"use client";

import { useCart } from "@/store/cart";

export default function CartPage() {
    const { items, removeFromCart, clearCart } = useCart();

    const total = items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
    );

    return (
        <div className="p-4">
            <h1 className="text-2xl mb-4">Carrito</h1>

            {items.map((item) => (
                <div key={item.id} className="mb-2 flex justify-between">
                    <span>
                        {item.name} x{item.quantity}
                    </span>
                    <span>${item.price * item.quantity}</span>

                    <button onClick={() => removeFromCart(item.id)}>❌</button>
                </div>
            ))}

            <h2 className="mt-4 text-xl">Total: ${total}</h2>

            <button
                onClick={clearCart}
                className="mt-2 bg-red-600 px-3 py-1 rounded"
            >
                Vaciar carrito
            </button>
        </div>
    );
}
