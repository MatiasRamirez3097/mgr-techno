import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { getCategories } from "@/lib/products";
import { ProductForm } from "@/components/admin/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

export const dynamic = "force-dynamic";

export default async function AdminEditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    await connectDB();
    const [rawProduct, categories]: [Product, Category[]] = await Promise.all([
        ProductModel.findById(id).lean(),
        getCategories(),
    ]);

    if (!rawProduct) notFound();

    // Mapeamos al formato que espera ProductForm
    const product: Product = {
        _id: id,
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
        stock: (rawProduct as any).stock,
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
