import Link from "next/link";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { SearchBar } from "./SearchBar";
import { CartButton } from "./CartButton";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { CategoryMenu } from "./CategoryMenu";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function Navbar() {
    const [categories, session] = await Promise.all([
        getCategoriesBase({ limit: 0 }),
        getServerSession(authOptions),
    ]);

    const isAdmin = session?.role === "administrator";

    return (
        <header className="w-full bg-gray-950 border-b border-gray-800 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
                {/* Logo */}
                <Link
                    href="/"
                    className="text-xl font-bold tracking-tight shrink-0"
                >
                    <span className="text-white">MGR</span>
                    <span className="text-brand">TECHNO</span>
                </Link>

                {/* Buscador — oculto en mobile */}
                <div className="hidden md:flex flex-1 max-w-xl">
                    <SearchBar />
                </div>

                {/* Acciones */}
                <div className="ml-auto flex items-center gap-3">
                    {isAdmin && (
                        <Link
                            href="/admin/dashboard"
                            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/30 text-brand text-xs font-semibold hover:bg-brand hover:text-white transition-all shadow-sm"
                            title="Ir al panel de administración"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                            <span>Panel Admin</span>
                        </Link>
                    )}
                    <div className="hidden md:block">
                        <UserMenu />
                    </div>
                    <CartButton />
                    {/* Hamburguesa — solo mobile */}
                    <MobileMenu categories={categories} />
                </div>
            </div>

            {/* Barra de categorías — solo desktop */}
            <div className="hidden md:block border-t border-gray-800">
                <CategoryMenu categories={categories} />
            </div>
        </header>
    );
}
