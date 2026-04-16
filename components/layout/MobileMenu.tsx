"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { CategoryDTO } from "@/types/shared/category";
import { SearchBar } from "./SearchBar";

export function MobileMenu({ categories }: { categories: CategoryDTO[] }) {
    const [open, setOpen] = useState(false);
    const [expandedCat, setExpandedCat] = useState<string | null>(null);
    const pathname = usePathname();
    const { data: session } = useSession();

    // Cerrar al cambiar de ruta
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Bloquear scroll
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    const roots = categories.filter((c) => c.parentId === null);
    const children = (parentId: string) =>
        categories.filter((c) => c.parentId === parentId);

    return (
        <>
            {/* Botón hamburguesa */}
            <button
                onClick={() => setOpen(true)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Abrir menú"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                </svg>
            </button>

            {/* Overlay */}
            <div
                onClick={() => setOpen(false)}
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 md:hidden ${
                    open ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 h-full w-[85vw] max-w-sm bg-gray-950 z-50 flex flex-col shadow-2xl transition-transform duration-300 md:hidden ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* Header del drawer */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                    <Link href="/" className="text-lg font-bold">
                        <span className="text-white">MGR</span>
                        <span className="text-brand">TECHNO</span>
                    </Link>
                    <button
                        onClick={() => setOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5"
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

                {/* Buscador */}
                <div className="px-5 py-4 border-b border-gray-800">
                    <SearchBar />
                </div>

                {/* Categorías */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <p className="text-xs text-gray-500 font-medium px-2 mb-2 uppercase tracking-wider">
                        Categorías
                    </p>

                    <Link
                        href="/products"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        Todos los productos
                    </Link>

                    {roots.map((cat) => {
                        const subs = children(cat.id);
                        const hasChildren = subs.length > 0;
                        const isExpanded = expandedCat === cat.id;

                        return (
                            <div key={cat.id}>
                                <div className="flex items-center">
                                    <Link
                                        href={`/products?category=${cat.slug}`}
                                        className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                                    >
                                        {cat.name}
                                    </Link>
                                    {hasChildren && (
                                        <button
                                            onClick={() =>
                                                setExpandedCat(
                                                    isExpanded ? null : cat.id,
                                                )
                                            }
                                            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                strokeWidth={2}
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M19 9l-7 7-7-7"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Subcategorías */}
                                {hasChildren && isExpanded && (
                                    <div className="ml-4 border-l border-gray-800 pl-3 mb-1">
                                        {subs.map((sub) => (
                                            <Link
                                                key={sub.id}
                                                href={`/products?category=${sub.slug}`}
                                                className="flex items-center px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                            >
                                                {sub.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer del drawer — usuario */}
                <div className="border-t border-gray-800 px-5 py-4">
                    {session ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
                                    {session.user?.name
                                        ?.charAt(0)
                                        .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm text-white font-medium truncate">
                                        {session.user?.name}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {session.user?.email}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    href="/account/orders"
                                    className="flex-1 text-center text-sm py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white transition-colors"
                                >
                                    Mi cuenta
                                </Link>
                                <button
                                    onClick={() =>
                                        signOut({ callbackUrl: "/" })
                                    }
                                    className="flex-1 text-center text-sm py-2 rounded-lg bg-gray-800 text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Salir
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="w-full block text-center py-2.5 rounded-xl bg-brand text-white text-sm font-medium hover:brightness-110 transition-all"
                        >
                            Iniciar sesión
                        </Link>
                    )}
                </div>
            </div>
        </>
    );
}
