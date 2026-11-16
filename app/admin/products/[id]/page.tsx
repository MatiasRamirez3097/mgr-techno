import { connectDB } from "@/lib/mongodb";
import { getProductsById } from "@/services/products/getProductsById";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { getBrandsBase } from "@/services/brands/getBrandsBase";
import { ProductForm } from "@/components/admin/ProductForm";
import { notFound } from "next/navigation";
import { buildBackUrl } from "@/lib/buildBackUrl";
import type { ProductDTO } from "@/types/shared/product";
import type { CategoryDTO } from "@/types/shared/category";
import type { BrandDTO } from "@/types/shared/brand";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        page?: string;
        per_page?: string;
        search?: string;
    }>;
}) {
    const { id } = await params;
    const query = await searchParams;

    const backUrl = buildBackUrl("/admin/products", query);

    await connectDB();
    const [product, categories, brands]: [
        ProductDTO | null,
        CategoryDTO[],
        BrandDTO[],
    ] = await Promise.all([
        getProductsById(id),
        getCategoriesBase({ limit: 0 }),
        getBrandsBase({ limit: 0 }),
    ]);

    if (!product) notFound();

    return (
        <div>
            <AdminPageHeader
                back={{ href: backUrl, label: "Productos" }}
                title="Editar producto"
            />
            <ProductForm
                product={product}
                categories={categories}
                brands={brands}
                mode="edit"
            />
        </div>
    );
}
