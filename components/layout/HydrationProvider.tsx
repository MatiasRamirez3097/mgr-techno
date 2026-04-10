"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

export function HydrationProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        useCart.persist.rehydrate();
    }, []);

    return <>{children}</>;
}
