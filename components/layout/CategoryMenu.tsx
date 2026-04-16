"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category } from "@/types/category";
// Categorías que se agrupan bajo "Ofertas"
const OFERTAS_SLUGS = ["combos", "pc-completa"];

export function CategoryMenu({ categories }: { categories: Category[] }) {
    const [openId, setOpenId] = useState<string | null>(null);
    const [ofertasOpen, setOfertasOpen] = useState(false);

    // Excluimos "sin-categoria" y las que van dentro de Ofertas
    const roots = categories.filter(
        (c) =>
            c.parentId == null &&
            c.slug !== "uncategorized" &&
            c.slug !== "sin-categoria" &&
            !OFERTAS_SLUGS.includes(c.slug),
    );

    const children = (parentId: string) =>
        categories.filter((c) => c.parentId === parentId);

    // Categorías que van dentro del desplegable Ofertas
    const ofertasSubs = categories.filter((c) =>
        OFERTAS_SLUGS.includes(c.slug),
    );

    return (
        <nav className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-10">
            {/* Desplegable Ofertas */}
            <div
                className="relative"
                onMouseEnter={() => setOfertasOpen(true)}
                onMouseLeave={() => setOfertasOpen(false)}
            >
                <Link
                    href="/products?on_sale=true"
                    className="flex items-center gap-1 text-sm text-brand font-medium hover:text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors shrink-0 h-10"
                >
                    🔥 OFERTAS
                    {ofertasSubs.length > 0 && (
                        <span className="text-xs text-gray-400">▾</span>
                    )}
                </Link>

                {ofertasSubs.length > 0 && ofertasOpen && (
                    <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-48 z-50">
                        {ofertasSubs.map((sub) => (
                            <Link
                                key={sub._id}
                                href={`/products?category=${sub.slug}`}
                                className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                            >
                                {sub.name}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Resto de categorías raíz */}
            {roots.map((cat) => {
                const subs = children(cat._id);
                const hasChildren = subs.length > 0;

                return (
                    <div
                        key={cat._id}
                        className="relative"
                        onMouseEnter={() => hasChildren && setOpenId(cat._id)}
                        onMouseLeave={() => setOpenId(null)}
                    >
                        <Link
                            href={`/products?category=${cat.slug}`}
                            className="flex items-center gap-1 text-sm text-gray-300 hover:text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors shrink-0 h-10"
                        >
                            {cat.name}
                            {hasChildren && (
                                <span className="text-xs text-gray-400">▾</span>
                            )}
                        </Link>

                        {hasChildren && openId === cat._id && (
                            <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-48 z-50">
                                {subs.map((sub) => (
                                    <Link
                                        key={sub._id}
                                        href={`/products?category=${sub.slug}`}
                                        className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
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
    );
}
