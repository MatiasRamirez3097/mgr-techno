"use client";

import Link from "next/link";
import { useState } from "react";
import { Category } from "@/lib/products";

export function CategoryMenu({ categories }: { categories: Category[] }) {
    const [openId, setOpenId] = useState<number | null>(null);

    const roots = categories.filter((c) => c.parent === 0);
    const children = (parentId: number) =>
        categories.filter((c) => c.parent === parentId);

    return (
        <nav className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-10">
            <Link
                href="/products"
                className="text-sm text-gray-300 hover:text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors shrink-0"
            >
                Todos
            </Link>

            {roots.map((cat) => {
                const subs = children(cat.id);
                const hasChildren = subs.length > 0;

                return (
                    <div
                        key={cat.id}
                        className="relative"
                        onMouseEnter={() => hasChildren && setOpenId(cat.id)}
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

                        {hasChildren && openId === cat.id && (
                            <div className="absolute top-full left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-48 z-50">
                                {subs.map((sub) => (
                                    <Link
                                        key={sub.id}
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
