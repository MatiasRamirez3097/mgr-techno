import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { getCategories } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";
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
    const [rawProduct, categories] = await Promise.all([
        ProductModel.findById(id).lean(),
        getCategories(),
    ]);

    if (!rawProduct) notFound();

    // Mapeamos al formato que espera ProductForm
    const product = {
        _id: id,
        wooId: (rawProduct as any).wooId,
        name: (rawProduct as any).name,
        slug: (rawProduct as any).slug,
        status: (rawProduct as any).status,
        description: (rawProduct as any).description || "",
        shortDescription: (rawProduct as any).shortDescription || "",
        regularPrice: (rawProduct as any).regularPrice?.toString() || "",
        salePrice:
            (rawProduct as any).salePrice > 0
                ? (rawProduct as any).salePrice?.toString()
                : "",
        stockQuantity: (rawProduct as any).stock,
        manageStock: (rawProduct as any).manage_stock ?? true,
        weight: (rawProduct as any).weight?.toString() || "",
        dimensions: {
            length: (rawProduct as any).dimensions?.length?.toString() || "",
            width: (rawProduct as any).dimensions?.width?.toString() || "",
            height: (rawProduct as any).dimensions?.height?.toString() || "",
        },
        categories: (rawProduct as any).categories || [],
        featured: (rawProduct as any).featured || false,
        images: (rawProduct as any).images || [],
    };

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
