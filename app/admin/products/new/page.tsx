import { connectDB } from "@/lib/mongodb";
import { CategoryModel } from "@/models/Category";
import { ProductForm } from "@/components/admin/ProductForm";
import Link from "next/link";
import type { Category } from "@/types/category";

export default async function AdminNewProductPage() {
    await connectDB();
    const categories = await CategoryModel.find({}).sort({ name: 1 }).lean();

    const categoriesForForm = (categories as Category[]).map((c) => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        parentId: c.parentId,
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
                    Nuevo producto
                </h1>
            </div>
            <ProductForm categories={categoriesForForm} mode="create" />
        </div>
    );
}
