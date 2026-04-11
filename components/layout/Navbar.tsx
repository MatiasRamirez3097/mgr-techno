// components/layout/Navbar.tsx
import Link from "next/link";
import { getCategories } from "@/lib/products";
import { SearchBar } from "./SearchBar";
import { CartButton } from "./CartButton";
import { CategoryMenu } from "./CategoryMenu";
import { UserMenu } from "./UserMenu";

export async function Navbar() {
    const categories = await getCategories();

    return (
        <header className="w-full bg-gray-900 text-white sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
                <Link
                    href="/"
                    className="text-xl font-bold tracking-tight shrink-0"
                >
                    <span className="text-white">MGR</span>
                    <span className="text-orange-500">TECHNO</span>
                </Link>
                <div className="flex-1 max-w-xl">
                    <SearchBar />
                </div>
                <UserMenu />
                <div className="ml-auto shrink-0">
                    <CartButton />
                </div>
            </div>

            <div className="border-t border-gray-700">
                <CategoryMenu categories={categories} />
            </div>
        </header>
    );
}
