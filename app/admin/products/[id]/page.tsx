import { connectDB } from "@/lib/mongodb";
import { getProductsById } from "@/lib/products/getProductsById";
import { getCategoriesBase } from "@/lib/categories/getCategoriesBase";
import { ProductForm } from "@/components/admin/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductDTO } from "@/types/shared/product";
import type { CategoryDTO } from "@/types/shared/category";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await connectDB();
    const [product, categories]: [ProductDTO | null, CategoryDTO[]] =
        await Promise.all([
            getProductsById(id),
            getCategoriesBase({ limit: 0 }),
        ]);

    if (!product) notFound();

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
                    Editar producto
                </h1>
            </div>
            <ProductForm
                product={product}
                categories={categories}
                mode="edit"
            />
        </div>
    );
}
