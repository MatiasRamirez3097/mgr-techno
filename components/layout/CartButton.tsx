"use client";

import { useCartDrawer } from "./CartDrawerProvider";
import { useCart } from "@/store/cart";
import { useEffect, useState } from "react";

export function CartButton() {
    const { open } = useCartDrawer();
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const unsub = useCart.persist.onFinishHydration(() =>
            setHydrated(true),
        );
        if (useCart.persist.hasHydrated()) setHydrated(true);
        return () => unsub();
    }, []);

    const totalItems = useCart((state) =>
        state.items.reduce((acc, i) => acc + i.quantity, 0),
    );
    const totalPrice = useCart((state) =>
        state.items.reduce((acc, i) => acc + i.regularPrice * i.quantity, 0),
    );

    return (
        <button
            onClick={open}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
        >
            <div className="relative">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .955-.343 1.087-.835l1.45-5.432A1.125 1.125 0 0020.4 6.75H6.107M7.5 14.25L5.106 5.272M7.5 14.25l-1.5 1.5m12 0a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
                {hydrated && totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {totalItems > 99 ? "99+" : totalItems}
                    </span>
                )}
            </div>
            <span className="hidden sm:block">
                ${hydrated ? totalPrice.toLocaleString("es-AR") : "0"}
            </span>
        </button>
    );
}
