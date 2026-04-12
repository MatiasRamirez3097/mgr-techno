import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types/product";

type CartItem = Product & {
    quantity: number;
};

type CartStore = {
    items: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void; // 👈
    clearCart: () => void;
    getTotalItems: () => number; // 👈 útil para el badge del carrito
    getTotalPrice: () => number; // 👈 útil para el checkout
};

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addToCart: (product) =>
                set((state) => {
                    const existing = state.items.find(
                        (i) => i.id === product.id,
                    );

                    // Si no hay stock definido (null) dejamos agregar libremente
                    const maxStock = product.stock ?? Infinity;

                    if (existing) {
                        // No superar el stock disponible
                        if (existing.quantity >= maxStock) return state;

                        return {
                            items: state.items.map((i) =>
                                i.id === product.id
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i,
                            ),
                        };
                    }

                    // No agregar si no hay stock
                    if (maxStock <= 0) return state;

                    return {
                        items: [...state.items, { ...product, quantity: 1 }],
                    };
                }),

            removeFromCart: (id) =>
                set((state) => ({
                    items: state.items.filter((i) => i.id !== id),
                })),

            clearCart: () => set({ items: [] }),

            getTotalItems: () =>
                get().items.reduce((acc, i) => acc + i.quantity, 0),

            getTotalPrice: () =>
                get().items.reduce((acc, i) => acc + i.price * i.quantity, 0),
            updateQuantity: (id, quantity) =>
                set((state) => ({
                    items:
                        quantity <= 0
                            ? state.items.filter((i) => i.id !== id)
                            : state.items.map((i) =>
                                  i.id === id ? { ...i, quantity } : i,
                              ),
                })),
        }),
        {
            name: "mgr-cart",
            skipHydration: true,
        },
    ),
);
