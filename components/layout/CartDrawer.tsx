"use client";

import { useCart } from "@/store/cart";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getFinalPrice } from "@/lib/pricing";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
    const items = useCart((state) => state.items);
    const removeFromCart = useCart((state) => state.removeFromCart);
    const updateQuantity = useCart((state) => state.updateQuantity);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const unsub = useCart.persist.onFinishHydration(() =>
            setHydrated(true),
        );
        if (useCart.persist.hasHydrated()) setHydrated(true);
        return () => unsub();
    }, []);

    const totalPrice = items.reduce(
        (acc, i) => acc + getFinalPrice(i) * i.quantity,
        0,
    );

    // Bloquear scroll cuando está abierto
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-900 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">Tu carrito</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
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
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                    {!hydrated || items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-16 h-16"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .955-.343 1.087-.835l1.45-5.432A1.125 1.125 0 0020.4 6.75H6.107M7.5 14.25L5.106 5.272M7.5 14.25l-1.5 1.5m12 0a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            <p className="text-sm">Tu carrito está vacío</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="flex gap-4 bg-gray-800 rounded-xl p-3"
                            >
                                {/* Imagen */}
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-700 shrink-0">
                                    <Image
                                        src={item.image}
                                        alt={item.name}
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex flex-col justify-between flex-1 min-w-0">
                                    <p className="text-sm text-gray-100 font-medium line-clamp-2">
                                        {item.name}
                                    </p>
                                    {/*<p className="text-sm font-bold text-white">
                                        $
                                        {(
                                            item.regularPrice * item.quantity
                                        ).toLocaleString("es-AR")}
                                    </p>*/}
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-base font-bold text-white">
                                            $
                                            {getFinalPrice(item).toLocaleString(
                                                "es-AR",
                                            )}
                                        </span>
                                        {item.salePrice && (
                                            <span className="text-sm text-gray-500 line-through">
                                                $
                                                {item.regularPrice.toLocaleString(
                                                    "es-AR",
                                                )}
                                            </span>
                                        )}
                                    </div>

                                    {/* Controles cantidad */}
                                    <div className="flex items-center gap-2 mt-1">
                                        <button
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    item.quantity - 1,
                                                )
                                            }
                                            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-brand text-white text-lg flex items-center justify-center transition-colors"
                                        >
                                            −
                                        </button>
                                        <span className="text-sm text-white w-4 text-center">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() =>
                                                updateQuantity(
                                                    item.id,
                                                    item.quantity + 1,
                                                )
                                            }
                                            className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-brand text-white text-lg flex items-center justify-center transition-colors"
                                        >
                                            +
                                        </button>

                                        <button
                                            onClick={() =>
                                                removeFromCart(item.id)
                                            }
                                            className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={1.5}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {hydrated && items.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-700 flex flex-col gap-3">
                        <div className="flex justify-between text-white font-bold text-lg">
                            <span>Total</span>
                            <span>${totalPrice.toLocaleString("es-AR")}</span>
                        </div>
                        <Link
                            href="/checkout"
                            onClick={onClose}
                            className="w-full py-3 rounded-xl text-center text-white font-medium bg-brand hover:brightness-110 transition-all"
                        >
                            Ir al checkout
                        </Link>
                        <button
                            onClick={() => useCart.getState().clearCart()}
                            className="w-full py-2 rounded-xl text-center text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            Vaciar carrito
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
