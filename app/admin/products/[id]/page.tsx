import { getAdminProduct, getAdminCategories } from "@/lib/admin-products";
import { ProductForm } from "@/components/admin/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminEditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [product, categories] = await Promise.all([
        getAdminProduct(id),
        getAdminCategories(),
    ]);

    if (!product?.id) notFound();

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
