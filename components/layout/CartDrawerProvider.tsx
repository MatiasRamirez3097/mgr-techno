"use client";

import { createContext, useContext, useState } from "react";
import { CartDrawer } from "./CartDrawer";

const CartDrawerContext = createContext({ open: () => {} });

export function useCartDrawer() {
    return useContext(CartDrawerContext);
}

export function CartDrawerProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <CartDrawerContext.Provider value={{ open: () => setIsOpen(true) }}>
            {children}
            <CartDrawer open={isOpen} onClose={() => setIsOpen(false)} />
        </CartDrawerContext.Provider>
    );
}
