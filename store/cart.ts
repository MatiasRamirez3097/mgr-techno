import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ProductDTO } from "@/types/shared/product";
import { getFinalPrice } from "@/lib/pricing";
import { trackAddToCart } from "@/lib/metaPixel";
import { track } from "@/lib/analytics/track";

type CartItem = ProductDTO & {
    quantity: number;
};

type CartStore = {
    items: CartItem[];
    addToCart: (product: ProductDTO) => void;
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

            addToCart: (product) => {
                const quantityOf = () =>
                    get().items.find((i) => i.id === product.id)?.quantity ?? 0;
                const before = quantityOf();

                set((state) => {
                    const existing = state.items.find(
                        (i) => i.id === product.id,
                    );
                    // Si no hay stock definido (null) dejamos agregar libremente
                    const maxStock = product.availableStock ?? Infinity;

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
                });

                // Medición: sólo si realmente se agregó (no al llegar al tope de stock).
                // Acá y no en cada botón, para contar desde cualquier lugar de la tienda.
                if (quantityOf() > before) {
                    trackAddToCart(product, 1);
                    track("add_to_cart", { productId: product.id });
                }
            },

            removeFromCart: (id) =>
                set((state) => ({
                    items: state.items.filter((i) => i.id !== id),
                })),

            clearCart: () => set({ items: [] }),

            getTotalItems: () =>
                get().items.reduce((acc, i) => acc + i.quantity, 0),

            getTotalPrice: () => {
                return get().items.reduce((acc, i) => {
                    const p = getFinalPrice(i);
                    return acc + p * i.quantity;
                }, 0);
            },
            updateQuantity: (id, quantity) =>
                set((state) => {
                    const existing = state.items.find((i) => i.id === id);

                    if (existing) {
                        const maxStock = existing.availableStock ?? Infinity;

                        if (quantity <= 0) {
                            return {
                                items: state.items.filter((i) => i.id !== id),
                            };
                        }

                        const finalQuantity = Math.min(quantity, maxStock);
                        if (finalQuantity <= 0) {
                            return {
                                items: state.items.filter((i) => i.id !== id),
                            };
                        }

                        return {
                            items: state.items.map((i) =>
                                i.id === id
                                    ? { ...i, quantity: finalQuantity }
                                    : i,
                            ),
                        };
                    }
                    return state;
                }),
        }),
        {
            name: "mgr-cart",
            skipHydration: true,
        },
    ),
);
