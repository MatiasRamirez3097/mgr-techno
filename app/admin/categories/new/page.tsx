import { connectDB } from "@/lib/mongodb";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminNewCategoryPage() {
    await connectDB();
    const categories = await getCategoriesBase({ limit: 0 });

    return (
        <div>
            <AdminPageHeader
                back={{ href: "/admin/categories", label: "Categorías" }}
                title="Nueva Categoría"
            />
            <CategoryForm categories={categories} mode="create" />
        </div>
    );
}
