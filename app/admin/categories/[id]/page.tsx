import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";
import { getCategories } from "@/lib/products";
import { CategoryForm } from "@/components/admin/CategoryForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await connectDB();
    const [rawCategory, categories] = await Promise.all([
        CategoryModel.findById(id).lean(),
        getCategories(),
    ]);

    if (!rawCategory) notFound();

    // Mapeamos al formato que espera ProductForm
    const category = {
        _id: id,
        name: (rawCategory as any).name,
        slug: (rawCategory as any).slug,
        parentId: (rawCategory as any).parentId || null,
    };

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
