import { connectDB } from "@/lib/mongodb";
import { ProductForm } from "@/components/admin/ProductForm";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { getBrandsBase } from "@/services/brands/getBrandsBase";
import type { CategoryDTO } from "@/types/shared/category";
import type { BrandDTO } from "@/types/shared/brand";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
    await connectDB();
    const [categories, brands]: [CategoryDTO[], BrandDTO[]] = await Promise.all([
        getCategoriesBase({ limit: 0 }),
        getBrandsBase({ limit: 0 }),
    ]);

    return (
        <div>
            <AdminPageHeader
                back={{ href: "/admin/products", label: "Productos" }}
                title="Nuevo producto"
            />
            <ProductForm
                categories={categories}
                brands={brands}
                mode="create"
            />
        </div>
    );
}
