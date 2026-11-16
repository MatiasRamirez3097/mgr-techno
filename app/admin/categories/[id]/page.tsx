import { connectDB } from "@/lib/mongodb";
import { getCategoriesById } from "@/services/categories/getCategoriesById";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { CategoryForm } from "@/components/admin/CategoryForm";
import type { CategoryDTO } from "@/types/shared/category";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

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
            <AdminPageHeader
                back={{ href: "/admin/categories", label: "Categorías" }}
                title="Editar Categoría"
            />
            <CategoryForm
                category={category}
                categories={categories}
                mode="edit"
            />
        </div>
    );
}
