import { connectDB } from "@/lib/mongodb";
import { getCategoriesBase } from "@/lib/categories/getCategoriesBase";
import { CategoryForm } from "@/components/admin/CategoryForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminNewCategoryPage() {
    await connectDB();
    const categories = await getCategoriesBase({ limit: 0 });

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/categories"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver a categorías
                </Link>
                <h1 className="text-2xl font-bold text-white">
                    Nueva Categoría
                </h1>
            </div>
            <CategoryForm categories={categories} mode="create" />
        </div>
    );
}
