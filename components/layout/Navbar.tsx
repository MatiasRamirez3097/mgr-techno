import Link from "next/link";
import { getCategories } from "@/lib/products";
import { SearchBar } from "./SearchBar";
import { CartButton } from "./CartButton";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { CategoryMenu } from "./CategoryMenu";

export async function Navbar() {
    const categories = await getCategories();

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
