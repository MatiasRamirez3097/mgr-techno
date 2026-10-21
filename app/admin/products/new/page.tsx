import { connectDB } from "@/lib/mongodb";
import { ProductForm } from "@/components/admin/ProductForm";
import Link from "next/link";
import { getCategoriesBase } from "@/services/categories/getCategoriesBase";
import { getBrandsBase } from "@/services/brands/getBrandsBase";
import type { CategoryDTO } from "@/types/shared/category";
import type { BrandDTO } from "@/types/shared/brand";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
    await connectDB();
    const [categories, brands]: [CategoryDTO[], BrandDTO[]] = await Promise.all([
        getCategoriesBase({ limit: 0 }),
        getBrandsBase({ limit: 0 }),
    ]);

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/admin/products"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                    ← Volver
                </Link>
                <h1 className="text-2xl font-bold text-white">
                    Nuevo producto
                </h1>
            </div>
            <ProductForm
                categories={categories}
                brands={brands}
                mode="create"
            />
        </div>
    );
}
