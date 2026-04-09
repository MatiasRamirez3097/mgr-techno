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

                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.id === product.id
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i,
                            ),
                        };
                    }

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
        }),
        {
            name: "mgr-cart",
            skipHydration: true,
        },
    ),
);
