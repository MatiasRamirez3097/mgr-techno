import { connectDB } from "@/lib/mongodb";
import { ProductModel } from "@/models/Product";
import { CategoryModel } from "@/models/Category";
import { ProductForm } from "@/components/admin/ProductForm";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getAdminProduct(id: string) {
    await connectDB();
    return ProductModel.findOne({ wooId: parseInt(id) }).lean();
}

async function getAdminCategories() {
    await connectDB();
    return CategoryModel.find({}).sort({ name: 1 }).lean();
}

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

    if (!product) notFound();

    // Mapeamos MongoDB → formato que espera ProductForm
    const productForForm = {
        id: (product as any).wooId,
        wooId: (product as any).wooId,
        name: (product as any).name,
        slug: (product as any).slug,
        status: (product as any).status,
        description: (product as any).description,
        short_description: (product as any).shortDescription,
        regular_price: (product as any).regularPrice?.toString() || "",
        sale_price: (product as any).salePrice
            ? (product as any).salePrice.toString()
            : "",
        stock_quantity: (product as any).stock,
        manage_stock: (product as any).manage_stock ?? true,
        weight: (product as any).weight?.toString() || "",
        dimensions: (product as any).dimensions,
        categories: (product as any).categories || [],
        featured: (product as any).featured,
        images: (product as any).images || [],
    };

    const categoriesForForm = (categories as any[]).map((c) => ({
        id: c.wooId,
        name: c.name,
        slug: c.slug,
        parent: c.parent,
    }));

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
                product={productForForm}
                categories={categoriesForForm}
                mode="edit"
            />
        </div>
    );
}
