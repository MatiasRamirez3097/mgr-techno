import { connectDB } from "@/lib/mongodb";
import { getCategoriesById } from "@/lib/categories/getCategoriesById";
import { getCategoriesBase } from "@/lib/categories/getCategoriesBase";
import { CategoryForm } from "@/components/admin/CategoryForm";
import type { CategoryDTO } from "@/types/shared/category";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Category } from "@/types/category";

export const dynamic = "force-dynamic";

export default async function AdminEditCategoryPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await connectDB();
    const [category, categories]: [
        Category: CategoryDTO | null,
        categories: CategoryDTO[],
    ] = await Promise.all([
        getCategoriesById(id),
        getCategoriesBase({ limit: 0 }),
    ]);

    if (!category) notFound();
    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/categories"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">
                    Editar Categoria
                </h1>
            </div>
            <CategoryForm
                category={category}
                categories={categories}
                mode="edit"
            />
        </div>
    );
}
